# react-native-ota-updater

A new CLI generated with oclif

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/react-native-ota-updater.svg)](https://npmjs.org/package/react-native-ota-updater)
[![Downloads/week](https://img.shields.io/npm/dw/react-native-ota-updater.svg)](https://npmjs.org/package/react-native-ota-updater)

<!-- toc -->
* [react-native-ota-updater](#react-native-ota-updater)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @rentlydev/rnota-cli
$ rnota COMMAND
running command...
$ rnota (--version)
@rentlydev/rnota-cli/2.0.0 darwin-arm64 node-v22.17.1
$ rnota --help [COMMAND]
USAGE
  $ rnota COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`rnota access-key add ACCESSKEYNAME`](#rnota-access-key-add-accesskeyname)
* [`rnota access-key list`](#rnota-access-key-list)
* [`rnota access-key patch ACCESSKEYNAME`](#rnota-access-key-patch-accesskeyname)
* [`rnota access-key remove ACCESSKEYNAME`](#rnota-access-key-remove-accesskeyname)
* [`rnota codepush app add APPNAME`](#rnota-codepush-app-add-appname)
* [`rnota codepush app list`](#rnota-codepush-app-list)
* [`rnota codepush app remove APPNAME`](#rnota-codepush-app-remove-appname)
* [`rnota codepush collaborator add APPNAME EMAIL PERMISSION`](#rnota-codepush-collaborator-add-appname-email-permission)
* [`rnota codepush collaborator list APPNAME`](#rnota-codepush-collaborator-list-appname)
* [`rnota codepush collaborator remove APPNAME EMAIL`](#rnota-codepush-collaborator-remove-appname-email)
* [`rnota codepush debug PLATFORM`](#rnota-codepush-debug-platform)
* [`rnota codepush deployment add APPNAME DEPLOYMENTNAME`](#rnota-codepush-deployment-add-appname-deploymentname)
* [`rnota codepush deployment list APPNAME`](#rnota-codepush-deployment-list-appname)
* [`rnota codepush deployment remove APPNAME DEPLOYMENTNAME`](#rnota-codepush-deployment-remove-appname-deploymentname)
* [`rnota codepush history clear APPNAME DEPLOYMENTNAME`](#rnota-codepush-history-clear-appname-deploymentname)
* [`rnota codepush history list APPNAME DEPLOYMENTNAME`](#rnota-codepush-history-list-appname-deploymentname)
* [`rnota codepush release APPNAME UPDATECONTENTSPATH TARGETBINARYVERSION`](#rnota-codepush-release-appname-updatecontentspath-targetbinaryversion)
* [`rnota codepush release patch APPNAME DEPLOYMENTNAME`](#rnota-codepush-release-patch-appname-deploymentname)
* [`rnota codepush release promote APPNAME SOURCEDEPLOYMENTNAME TARGETDEPLOYMENTNAME`](#rnota-codepush-release-promote-appname-sourcedeploymentname-targetdeploymentname)
* [`rnota codepush release react APPNAME PLATFORM`](#rnota-codepush-release-react-appname-platform)
* [`rnota codepush release rollback APPNAME DEPLOYMENTNAME`](#rnota-codepush-release-rollback-appname-deploymentname)
* [`rnota codepush stats`](#rnota-codepush-stats)
* [`rnota config`](#rnota-config)
* [`rnota help [COMMAND]`](#rnota-help-command)
* [`rnota login`](#rnota-login)
* [`rnota logout`](#rnota-logout)
* [`rnota whoami`](#rnota-whoami)

## `rnota access-key add ACCESSKEYNAME`

Create a new access key associated with your account. Access keys are used to authenticate with the React Native OTA Updater service and can be configured with custom names and expiration times.

```
USAGE
  $ rnota access-key add ACCESSKEYNAME [-t <value>]

ARGUMENTS
  ACCESSKEYNAME  Name to identify this access key in listings and management

FLAGS
  -t, --ttl=<value>  [default: 60d] Time-to-live duration for the access key. Accepts duration strings like '5m' (5
                     minutes), '60d' (60 days), or '1y' (1 year). [default: '60d']

DESCRIPTION
  Create a new access key associated with your account. Access keys are used to authenticate with the React Native OTA
  Updater service and can be configured with custom names and expiration times.

EXAMPLES
  Create a new access key with default expiration (30 days)

    $ rnota access-key add "MyNewKey"

  Create a new access key that expires in 7 days

    $ rnota access-key add "WeeklyKey" --ttl 7d

  Create a new access key that expires in 12 hours

    $ rnota access-key add "TempKey" --ttl 12h
```

## `rnota access-key list`

List all access keys associated with your account

```
USAGE
  $ rnota access-key list [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all access keys associated with your account

EXAMPLES
  List all access keys in a formatted table

    $ rnota access-key list

  List all access keys in JSON format for programmatic use

    $ rnota access-key list --json
```

## `rnota access-key patch ACCESSKEYNAME`

Update the name or expiration time of an existing access key

```
USAGE
  $ rnota access-key patch ACCESSKEYNAME [-n <value>] [-t <value>]

ARGUMENTS
  ACCESSKEYNAME  Current name of the access key to update

FLAGS
  -n, --name=<value>  New name for the access key
  -t, --ttl=<value>   [default: 60d] Time-to-live duration for the access key. Accepts duration strings like '5m' (5
                      minutes), '60d' (60 days), or '1y' (1 year). [default: '60d']

DESCRIPTION
  Update the name or expiration time of an existing access key

EXAMPLES
  Update the name of an access key

    $ rnota access-key patch "OldKeyName" -n "NewKeyName"

  Update the expiration time of an access key

    $ rnota access-key patch "MyKey" --ttl 30d

  Update both name and expiration time

    $ rnota access-key patch "OldKeyName" -n "NewKeyName" --ttl 90d
```

## `rnota access-key remove ACCESSKEYNAME`

Remove an access key from your account

```
USAGE
  $ rnota access-key remove ACCESSKEYNAME

ARGUMENTS
  ACCESSKEYNAME  Name of the access key to remove

DESCRIPTION
  Remove an access key from your account

EXAMPLES
  Remove an access key by name

    $ rnota access-key remove "MyOldKey"
```

## `rnota codepush app add APPNAME`

Register a new CodePush application with the React Native OTA Updater service

```
USAGE
  $ rnota codepush app add APPNAME

ARGUMENTS
  APPNAME  Name for the new CodePush application (must be unique)

DESCRIPTION
  Register a new CodePush application with the React Native OTA Updater service

EXAMPLES
  Create a new CodePush application with default deployments

    $ rnota codepush app add "MyNewApp"
```

## `rnota codepush app list`

List all CodePush applications you have access to

```
USAGE
  $ rnota codepush app list [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all CodePush applications you have access to

EXAMPLES
  List CodePush apps in table format

    $ rnota codepush app list

  List CodePush apps in JSON format

    $ rnota codepush app list --json
```

## `rnota codepush app remove APPNAME`

Remove a CodePush application and all of its data

```
USAGE
  $ rnota codepush app remove APPNAME

ARGUMENTS
  APPNAME  Name of the CodePush app to remove

DESCRIPTION
  Remove a CodePush application and all of its data

EXAMPLES
  Remove a CodePush app by name

    $ rnota codepush app remove "MyApp"
```

## `rnota codepush collaborator add APPNAME EMAIL PERMISSION`

Add a collaborator to a CodePush application

```
USAGE
  $ rnota codepush collaborator add APPNAME EMAIL PERMISSION

ARGUMENTS
  APPNAME     Name of the CodePush app to add collaborator to
  EMAIL       Email address of the user to add as CodePush collaborator
  PERMISSION  (owner|collaborator|admin) Permission level to grant to the CodePush collaborator

DESCRIPTION
  Add a collaborator to a CodePush application

EXAMPLES
  Add a collaborator with basic access

    $ rnota codepush collaborator add "MyApp" "dev@example.com" collaborator

  Add an admin collaborator

    $ rnota codepush collaborator add "MyApp" "admin@example.com" admin
```

## `rnota codepush collaborator list APPNAME`

List all collaborators for a CodePush application

```
USAGE
  $ rnota codepush collaborator list APPNAME [--json]

ARGUMENTS
  APPNAME  Name of the CodePush app to list collaborators for

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all collaborators for a CodePush application

EXAMPLES
  List collaborators in table format

    $ rnota codepush collaborator list "MyApp"

  List collaborators in JSON format

    $ rnota codepush collaborator list "MyApp" --json
```

## `rnota codepush collaborator remove APPNAME EMAIL`

Remove a CodePush collaborator

```
USAGE
  $ rnota codepush collaborator remove APPNAME EMAIL

ARGUMENTS
  APPNAME  Name of the CodePush app to remove collaborator from
  EMAIL    Email address of the collaborator to remove

DESCRIPTION
  Remove a CodePush collaborator

EXAMPLES
  Remove a CodePush collaborator

    $ rnota codepush collaborator remove "MyApp" "dev@example.com"
```

## `rnota codepush debug PLATFORM`

View CodePush debug logs from Android/iOS devices/simulators

```
USAGE
  $ rnota codepush debug PLATFORM

ARGUMENTS
  PLATFORM  (android|ios) Platform to view debug logs for

DESCRIPTION
  View CodePush debug logs from Android/iOS devices/simulators

EXAMPLES
  $ rnota codepush debug android

  $ rnota codepush debug ios
```

## `rnota codepush deployment add APPNAME DEPLOYMENTNAME`

Create a new deployment for a CodePush application

```
USAGE
  $ rnota codepush deployment add APPNAME DEPLOYMENTNAME

ARGUMENTS
  APPNAME         Name of the CodePush app to add deployment to
  DEPLOYMENTNAME  Name for the new deployment

DESCRIPTION
  Create a new deployment for a CodePush application

EXAMPLES
  Create a new deployment for both platforms

    $ rnota codepush deployment add "MyApp" "Beta"
```

## `rnota codepush deployment list APPNAME`

List all deployments for a CodePush application

```
USAGE
  $ rnota codepush deployment list APPNAME

ARGUMENTS
  APPNAME  Name of the CodePush app to list deployments for

DESCRIPTION
  List all deployments for a CodePush application

EXAMPLES
  List all deployments for an app

    $ rnota codepush deployment list "MyApp"
```

## `rnota codepush deployment remove APPNAME DEPLOYMENTNAME`

Remove a deployment from a CodePush application

```
USAGE
  $ rnota codepush deployment remove APPNAME DEPLOYMENTNAME

ARGUMENTS
  APPNAME         Name of the CodePush app to remove deployment from
  DEPLOYMENTNAME  Name of the deployment to remove

DESCRIPTION
  Remove a deployment from a CodePush application

EXAMPLES
  Remove a deployment from an app

    $ rnota codepush deployment remove "MyApp" "Beta"
```

## `rnota codepush history clear APPNAME DEPLOYMENTNAME`

Clear the release history for a CodePush deployment

```
USAGE
  $ rnota codepush history clear APPNAME DEPLOYMENTNAME -p ios|android

ARGUMENTS
  APPNAME         Name of the CodePush app containing the deployment
  DEPLOYMENTNAME  Name of the deployment to clear history for

FLAGS
  -p, --platform=<option>  (required) Platform to clear history for
                           <options: ios|android>

DESCRIPTION
  Clear the release history for a CodePush deployment

EXAMPLES
  Clear iOS deployment history

    $ rnota codepush history clear "MyApp" "Production" -p ios

  Clear Android deployment history

    $ rnota codepush history clear "MyApp" "Staging" -p android
```

## `rnota codepush history list APPNAME DEPLOYMENTNAME`

List the release history for a CodePush deployment

```
USAGE
  $ rnota codepush history list APPNAME DEPLOYMENTNAME -p ios|android

ARGUMENTS
  APPNAME         Name of the CodePush app to view history for
  DEPLOYMENTNAME  Name of the deployment to view history for

FLAGS
  -p, --platform=<option>  (required) Platform to view history for
                           <options: ios|android>

DESCRIPTION
  List the release history for a CodePush deployment

EXAMPLES
  List iOS deployment history

    $ rnota codepush history list "MyApp" "Production" -p ios

  List Android deployment history

    $ rnota codepush history list "MyApp" "Staging" -p android
```

## `rnota codepush release APPNAME UPDATECONTENTSPATH TARGETBINARYVERSION`

Create a new release for a CodePush application

```
USAGE
  $ rnota codepush release APPNAME UPDATECONTENTSPATH TARGETBINARYVERSION -p ios|android -d <value> [--description
    <value>] [-x] [-m] [-r <value>]

ARGUMENTS
  APPNAME              Name of the CodePush app to release to
  UPDATECONTENTSPATH   Path to the update contents (e.g., bundled JS)
  TARGETBINARYVERSION  Semver expression for the target binary version (e.g., 1.0.0 or ^1.2.3)

FLAGS
  -d, --deploymentName=<value>  (required) [default: Staging] Deployment to release to
  -m, --mandatory               Whether this release should be mandatory
  -p, --platform=<option>       (required) Platform to release for
                                <options: ios|android>
  -r, --rollout=<value>         Percentage of users to roll out to
  -x, --disabled                Whether to disable this release initially
      --description=<value>     Description of the changes in this release

DESCRIPTION
  Create a new release for a CodePush application

EXAMPLES
  Release an update to staging

    $ rnota codepush release "MyApp" "./dist" "1.0.0" -p ios

  Release mandatory update

    $ rnota codepush release "MyApp" "./dist" "1.0.0" -p android -d Production -m

  Release with rollout

    $ rnota codepush release "MyApp" "./dist" "^1.0.0" -p ios -r 25%

  Release with description

    $ rnota codepush release "MyApp" "./dist" "1.0.0" -p ios --des "Bug fixes and improvements"
```

## `rnota codepush release patch APPNAME DEPLOYMENTNAME`

Modify metadata for an existing CodePush release

```
USAGE
  $ rnota codepush release patch APPNAME DEPLOYMENTNAME -p ios|android [-d <value>] [-l <value>] [-x] [-m] [-r <value>] [-t
    <value>]

ARGUMENTS
  APPNAME         Name of the CodePush app containing the release
  DEPLOYMENTNAME  Name of the deployment containing the release

FLAGS
  -d, --description=<value>          Updated description for the release
  -l, --label=<value>                Label of the release to patch
  -m, --mandatory                    Whether to make the release mandatory
  -p, --platform=<option>            (required) Platform to patch the release for
                                     <options: ios|android>
  -r, --rollout=<value>              Updated percentage of users this release should be available to
  -t, --targetBinaryVersion=<value>  Updated semver expression for the target app version
  -x, --disabled                     Whether to disable the release

DESCRIPTION
  Modify metadata for an existing CodePush release

EXAMPLES
  Update release description

    $ rnota codepush release patch "MyApp" "Production" -p ios -d "Fixed critical bug"

  Make release mandatory

    $ rnota codepush release patch "MyApp" "Staging" -p android -m

  Adjust rollout percentage

    $ rnota codepush release patch "MyApp" "Production" -p ios -r 50%

  Disable a release

    $ rnota codepush release patch "MyApp" "Production" -p ios -x
```

## `rnota codepush release promote APPNAME SOURCEDEPLOYMENTNAME TARGETDEPLOYMENTNAME`

Promote a release from one deployment to another

```
USAGE
  $ rnota codepush release promote APPNAME SOURCEDEPLOYMENTNAME TARGETDEPLOYMENTNAME -p ios|android [-d <value>] [-l <value>]
    [-x] [-m] [-r <value>] [-t <value>]

ARGUMENTS
  APPNAME               Name of the CodePush app containing the deployments
  SOURCEDEPLOYMENTNAME  Name of the source deployment to promote from
  TARGETDEPLOYMENTNAME  Name of the target deployment to promote to

FLAGS
  -d, --description=<value>          Description of the changes made to the app in this promotion
  -l, --label=<value>                Label of the release to promote
  -m, --mandatory                    Whether this release should be considered mandatory
  -p, --platform=<option>            (required) Platform to promote for
                                     <options: ios|android>
  -r, --rollout=<value>              Percentage of users this release should be available to
  -t, --targetBinaryVersion=<value>  Semver expression that specifies the binary app version this release is targeting
  -x, --disabled                     Whether this release should be immediately downloadable

DESCRIPTION
  Promote a release from one deployment to another

EXAMPLES
  Promote from Staging to Production

    $ rnota codepush release promote "MyApp" "Staging" "Production" -p ios

  Promote with custom rollout

    $ rnota codepush release promote "MyApp" "Staging" "Production" -p android -r 25%

  Promote as mandatory update

    $ rnota codepush release promote "MyApp" "Staging" "Production" -p ios -m
```

## `rnota codepush release react APPNAME PLATFORM`

Create a React Native release for a CodePush application

```
USAGE
  $ rnota codepush release react APPNAME PLATFORM [-b <value>] [-d <value>] [--description <value>] [--development] [-x] [-e
    <value>] [-g <value>] [-p <value>] [--plistFilePrefix <value>] [--podFile <value>] [-m] [-r <value>] [-s <value>]
    [-o <value>] [-t <value>] [-h] [--extraHermesFlags <value>...] [-k <value>]

ARGUMENTS
  APPNAME   Name of the CodePush app to release to
  PLATFORM  (ios|android) Platform to release for

FLAGS
  -b, --bundleName=<value>           Name of the entry bundle file
  -d, --deploymentName=<value>       [default: Staging] Deployment to release to
  -e, --entryFile=<value>            Path to the app's entry JavaScript file
  -g, --gradleFile=<value>           Path to the gradle file for Android version detection
  -h, --useHermes                    Enable Hermes engine for the bundle
  -k, --privateKeyPath=<value>       Path to the private key for signing the bundle
  -m, --mandatory                    Whether this release should be mandatory
  -o, --outputDir=<value>            Directory to place the generated JS bundle and resources
  -p, --plistFile=<value>            Path to the plist file for iOS version detection
  -r, --rollout=<value>              [default: 100%] Percentage of users this release should be available to
  -s, --sourcemapOutput=<value>      Path to where the sourcemap for the resulting bundle should be written
  -t, --targetBinaryVersion=<value>  Semver expression that specifies the binary app version to target
  -x, --disabled                     Whether to disable this release initially
      --description=<value>          Description of the changes in this release
      --development                  Generate the bundle in development mode
      --extraHermesFlags=<value>...  Additional arguments to pass to the Hermes compiler
      --plistFilePrefix=<value>      Prefix to append to the plist filename
      --podFile=<value>              Path to the pod file for iOS configuration

DESCRIPTION
  Create a React Native release for a CodePush application

EXAMPLES
  Release a React Native update to staging

    $ rnota codepush release react "MyApp" ios

  Release with custom entry file

    $ rnota codepush release react "MyApp" android --entryFile MyApp.js

  Release a mandatory update with description

    $ rnota codepush release react "MyApp" ios -m --description "Bug fixes"

  Release an update with custom binary version targeting

    $ rnota codepush release react "MyApp" android -t "1.2.x"
```

## `rnota codepush release rollback APPNAME DEPLOYMENTNAME`

Roll back to a previous release for a CodePush deployment

```
USAGE
  $ rnota codepush release rollback APPNAME DEPLOYMENTNAME -p ios|android [-l <value>]

ARGUMENTS
  APPNAME         Name of the CodePush app containing the deployment
  DEPLOYMENTNAME  Name of the deployment to roll back

FLAGS
  -l, --targetRelease=<value>  Label of the release to roll back to (defaults to previous release)
  -p, --platform=<option>      (required) Platform to roll back
                               <options: ios|android>

DESCRIPTION
  Roll back to a previous release for a CodePush deployment

EXAMPLES
  Roll back to the previous release

    $ rnota codepush release rollback "MyApp" "Production" -p ios

  Roll back to a specific release

    $ rnota codepush release rollback "MyApp" "Staging" -p android -l v5
```

## `rnota codepush stats`

Display CodePush release statistics

```
USAGE
  $ rnota codepush stats

DESCRIPTION
  Display CodePush release statistics

EXAMPLES
  $ rnota codepush stats

  $ rnota codepush stats --json
```

## `rnota config`

Open the credentials vault configuration file

```
USAGE
  $ rnota config

DESCRIPTION
  Open the credentials vault configuration file

EXAMPLES
  Open the config file in default editor or file explorer

    $ rnota config
```

## `rnota help [COMMAND]`

Display help for rnota.

```
USAGE
  $ rnota help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for rnota.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.25/src/commands/help.ts)_

## `rnota login`

Authenticate with the React Native OTA Updater service to manage your apps

```
USAGE
  $ rnota login [-k <value>] [-s <value>]

FLAGS
  -k, --accessKey=<value>  Access key for direct authentication
  -s, --serverUrl=<value>  URL of the custom CodePush server to authenticate against. If not provided, uses the default
                           server.

DESCRIPTION
  Authenticate with the React Native OTA Updater service to manage your apps

EXAMPLES
  Login using browser-based authentication

    $ rnota login

  Login using an access key

    $ rnota login --accessKey myAccessKey

  Login to a custom server

    $ rnota login --serverUrl http://localhost:3000

  Login with access key to custom server

    $ rnota login -k myAccessKey -s http://localhost:3000
```

## `rnota logout`

Log out of the current session and clean up credentials

```
USAGE
  $ rnota logout

DESCRIPTION
  Log out of the current session and clean up credentials

EXAMPLES
  Log out and remove all session data

    $ rnota logout
```

## `rnota whoami`

Display account information for the current session

```
USAGE
  $ rnota whoami

DESCRIPTION
  Display account information for the current session

EXAMPLES
  Show currently logged in user

    $ rnota whoami
```
<!-- commandsstop -->
