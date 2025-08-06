#!/usr/bin/env bash

export NODE_OPTIONS=--max_old_space_size=8192

# Environment variables
export PASSWORD="password"
export RNOTA_APP_NAME="Your App Name"
# Set Sentry environment variables
export SENTRY_ORG=""
export SENTRY_PROJECT=""
export SENTRY_AUTH_TOKEN=""

# ********************************************************
# ********* Don't change any other details below *********
# ********* Don't change any other details below *********
# ********* Don't change any other details below *********
# ********************************************************

# Enable exit on error and pipeline failure
set -e
set -o pipefail

# Function to handle Ctrl + C
if [ -t 0 ]; then
    trap 'echo -e "\n⛔ Ctrl + C detected. Exiting."; exit 1' INT
fi

# ********************************************************
# ********* Helper functions *********
# ********************************************************
function print_section() {
    echo -e "\n=======================================\n$1\n=======================================\n"
}

function check_password() {
    if [ ! -t 0 ]; then
        echo "Non-interactive shell detected. Skipping password check..."
        return
    fi

    # Password check
    read -s -p "🔑 Enter the password: " user_password
    echo

    if [ "$user_password" != "$PASSWORD" ]; then
        echo "⛔ Incorrect password. Exiting."
        exit 1
    fi
}

function check_branch_status() {
    # Create a temporary index to not mess with working directory
    git update-index -q --refresh

    # Check for unstaged and uncommitted changes, excluding rnotaConfig.cfg
    local changes=$(git status --porcelain | grep -v -E "rnotaConfig.cfg")

    if [ -n "$changes" ]; then
        if [ "$prepare_for_prod_release" -eq 1 ]; then
            echo "❌ ERROR: Branch has uncommitted changes"
            echo "🚨 Please commit or stash changes before proceeding with production release"
            echo "$changes"
            echo
            exit 1
        else
            echo "⚠️ WARNING: Branch has uncommitted changes (excluding rnotaConfig.cfg):"
            echo "$changes"
            echo
            return 1
        fi
    fi

    return 0
}

function format_deployment_description() {
    local branch_status="Clean"
    if ! check_branch_status; then
        branch_status="Dirty"
        print_section "⚠️ WARNING: Proceeding with dirty branch state!"
    fi

    # Get git information
    local current_date=$(date '+%d %b %y')
    local git_user=$(git config user.email)
    local git_branch=$(git rev-parse --abbrev-ref HEAD)
    local git_commit=$(git rev-parse HEAD)
    local git_commit_msg=$(git log -1 --pretty=%s | tr -d '\n') # Remove any newlines from commit message & Get only the commit title/subject line

    # Set  sourcemaps based on prepare_for_prod_release
    include_sourcemaps=$([[ "$prepare_for_prod_release" -eq 1 ]] && echo "1" || echo "0")

    # Convert include_sourcemaps status to true/false
    local sourcemaps_status=$([ "$include_sourcemaps" -eq 1 ] && echo "true" || echo "false")

    # Format the description
    deploymentDescription="${deploymentDescription}
*Date:* ${current_date}
*By:* ${git_user}
*Branch:* ${git_branch} (${branch_status})
*Commit:* ${git_commit:0:8} - ${git_commit_msg}
*Sourcemaps:* ${sourcemaps_status}"

    print_section "Final Description: \n$deploymentDescription"
}

function run_yarn() {
    if [ "$skip_yarn" -eq 0 ]; then
        print_section "⚠️ Cleaning Up Yarn..."
        # rm -rf node_modules
        yarn
        print_section "🚀 Yarn Clean Up & Installation Done!"
    else
        print_section "⚠️ Skipping Yarn Clean Up & Installation..."
    fi
}

function notify_chat() {
    # Message to send
    local message=$1

    if [ -z "$message" ]; then
        echo "❌ Error: Message is empty or missing."
        exit 1
    fi

    # Escape the message text to make it "safe".
    escapedText=$(echo "$message" | sed 's/\n/\\n/g' | sed 's/"/\\"/g' | sed "s/'/\\'/g")

    # Create a json object with the text.
    local message_json="{\"text\": \"$escapedText\"}"

    # Send the message via CURL and capture the response
    local response=$(curl -s --request POST -H "Content-Type: application/json" --data "$message_json" "$WEBHOOK_URL_IN_HOUSE")
}

# Upload sourcemaps to Sentry
function upload_sourcemaps() {
    local platform="$1"
    local sourceMapDir="$2"

    # Upload to Sentry
    echo "⚠️ Uploading source maps to Sentry..."
    npx sentry-cli sourcemaps upload --debug-id-reference --strip-prefix $(pwd) "$sourceMapDir"

    if [ $? -eq 0 ]; then
        print_section "⚠️ Deleting source map directory: $sourceMapDir"
        rm -rf "$sourceMapDir"
        print_section "🚀 Source map directory deleted."
    else
        echo "🚨 Sentry upload failed. Skipping build folder cleanup."
    fi
}

function release_to_platform() {
    local platform="$1"
    local platform_lower=$(echo "$platform" | tr '[:upper:]' '[:lower:]')

    print_section "ℹ️ APP_NAME: ${RNOTA_APP_NAME} PLATFORM: ${platform} CODE_PUSH_DEPLOYMENT_CHANNEL: ${deployment_channel}"

    # Configure sourcemaps
    local sourceMapOutputFlag=""
    local sourceMapOutputDir=""
    # Generate a unique folder name using Unix timestamp if sourcemaps are included
    if [ "$include_sourcemaps" -eq 1 ]; then
        local timestamp=$(date +%s)
        sourceMapOutputDir="./build/codepush/$timestamp/$platform_lower"
        sourceMapOutputFlag="-o $sourceMapOutputDir -s $sourceMapOutputDir"
        mkdir -p "$sourceMapOutputDir"
    fi

    local mandatory_update_flag=""
    if [ "$mandatory_update" -eq 1 ]; then
        mandatory_update_flag="-m"
        print_section "🚨 Mandatory update flag is set"
    fi

    # Run codepush
    rnota codepush release react "$RNOTA_APP_NAME" "$platform_lower" -t "$version" -d "$deployment_channel" --description "$deploymentDescription" $mandatory_update_flag $sourceMapOutputFlag

    # Conditionally upload source maps
    if [ "$include_sourcemaps" -eq 1 ]; then
        upload_sourcemaps $platform $sourceMapOutputDir
    fi

    # Notify success
    print_section "🎉 Codepush for $platform is done, TARGET Version : $version Description : $deploymentDescription"
    notify_chat "Codepush for *$platform* is done!\n\nTarget Version: *$version* *$deployment_channel*\n\n*Description:* $deploymentDescription"
}

# ********************************************************
# ********* Main function *********
# ********************************************************
function main() {
    # Check password once before running all deployments
    check_password

    # Read configuration file
    CONFIG_FILE="rnotaConfig.cfg"
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "❌ Error: Configuration file $CONFIG_FILE not found."
        exit 1
    fi
    source "$CONFIG_FILE"

    # Prepare deployment description
    format_deployment_description

    # Prepare deployment
    run_yarn

    # Release to platforms
    if [ "$release_ios" -eq 1 ] && [ "$release_android" -eq 1 ]; then
        if [ "$run_in_parallel" -eq 1 ]; then
            # Parallel execution
            print_section "🚅 Running in parallel"

            release_to_platform "iOS" &
            release_to_platform "Android"

            # Wait for both processes to complete
            wait
        else
            # Serial execution
            print_section "🔄 Running in serial"

            release_to_platform "iOS"
            release_to_platform "Android"
        fi
    else
        # Serial execution for single platform
        print_section "🔄 Running in serial"

        [ "$release_ios" -eq 1 ] && release_to_platform "iOS"
        [ "$release_android" -eq 1 ] && release_to_platform "Android"
    fi
}

main
