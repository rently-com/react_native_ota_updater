CREATE TYPE "public"."permissions_enum" AS ENUM('admin', 'owner', 'collaborator');--> statement-breakpoint
CREATE TYPE "public"."release_methods_enum" AS ENUM('upload', 'promote', 'rollback');--> statement-breakpoint
CREATE TYPE "public"."platforms_enum" AS ENUM('ios', 'android');--> statement-breakpoint
CREATE TABLE "access_key" (
	"token" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp(0) with time zone NOT NULL,
	CONSTRAINT "access_key_name_user_unique" UNIQUE("name","user_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"image" text,
	"email_verified" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "codepush_app" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"icon_url" text DEFAULT 'https://cdn4.iconfinder.com/data/icons/logos-3/600/React.js_logo-512.png',
	CONSTRAINT "codepush_app_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "codepush_collaborator" (
	"permission" "permissions_enum" NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	CONSTRAINT "codepush_collaborator_user_app_pk" PRIMARY KEY("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "codepush_deployment" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"platform_id" text NOT NULL,
	CONSTRAINT "codepush_deployment_name_platform_unique" UNIQUE("name","platform_id")
);
--> statement-breakpoint
CREATE TABLE "codepush_platform" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "platforms_enum" NOT NULL,
	"app_id" text NOT NULL,
	CONSTRAINT "codepush_platform_name_app_unique" UNIQUE("name","app_id")
);
--> statement-breakpoint
CREATE TABLE "codepush_release" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"package_hash" text NOT NULL,
	"description" text,
	"label" text NOT NULL,
	"app_version" text NOT NULL,
	"rollout" integer,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"release_method" "release_methods_enum" DEFAULT 'upload' NOT NULL,
	"size" integer NOT NULL,
	"blob_id" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"original_label" text,
	"original_deployment_name" text,
	"released_by_user_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	CONSTRAINT "codepush_release_label_deployment_unique" UNIQUE("label","deployment_id")
);
--> statement-breakpoint
CREATE TABLE "codepush_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"active_count" integer DEFAULT 0 NOT NULL,
	"installed_count" integer DEFAULT 0 NOT NULL,
	"downloaded_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codepush_metrics_releaseId_unique" UNIQUE("release_id")
);
--> statement-breakpoint
CREATE TABLE "expo_app" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"icon_url" text DEFAULT 'https://cdn4.iconfinder.com/data/icons/logos-3/600/React.js_logo-512.png',
	CONSTRAINT "expo_app_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expo_collaborator" (
	"permission" "permissions_enum" NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	CONSTRAINT "expo_collaborator_user_app_pk" PRIMARY KEY("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "expo_channel" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"app_id" text NOT NULL,
	CONSTRAINT "expo_channel_name_app_unique" UNIQUE("name","app_id")
);
--> statement-breakpoint
CREATE TABLE "expo_release" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"runtime_version" text,
	"size" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"commit_hash" text,
	"commit_message" text,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"release_method" "release_methods_enum" DEFAULT 'upload' NOT NULL,
	"original_release_id" text,
	"original_channel_name" text,
	"released_by_user_id" text NOT NULL,
	"channel_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expo_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"android_count" integer DEFAULT 0 NOT NULL,
	"ios_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "expo_metrics_releaseId_unique" UNIQUE("release_id")
);
--> statement-breakpoint
ALTER TABLE "access_key" ADD CONSTRAINT "access_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_collaborator" ADD CONSTRAINT "codepush_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_collaborator" ADD CONSTRAINT "codepush_collaborator_app_id_codepush_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."codepush_app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_deployment" ADD CONSTRAINT "codepush_deployment_platform_id_codepush_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."codepush_platform"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_platform" ADD CONSTRAINT "codepush_platform_app_id_codepush_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."codepush_app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_release" ADD CONSTRAINT "codepush_release_released_by_user_id_user_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codepush_release" ADD CONSTRAINT "codepush_release_deployment_id_codepush_deployment_key_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."codepush_deployment"("key") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codepush_metrics" ADD CONSTRAINT "codepush_metrics_release_id_codepush_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."codepush_release"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expo_collaborator" ADD CONSTRAINT "expo_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expo_collaborator" ADD CONSTRAINT "expo_collaborator_app_id_expo_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."expo_app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expo_channel" ADD CONSTRAINT "expo_channel_app_id_expo_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."expo_app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expo_release" ADD CONSTRAINT "expo_release_released_by_user_id_user_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_release" ADD CONSTRAINT "expo_release_channel_id_expo_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."expo_channel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expo_metrics" ADD CONSTRAINT "expo_metrics_release_id_expo_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."expo_release"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "codepush_app_name_idx" ON "codepush_app" USING btree ("name");--> statement-breakpoint
CREATE INDEX "codepush_release_label_idx" ON "codepush_release" USING btree ("label");--> statement-breakpoint
CREATE INDEX "expo_app_name_index" ON "expo_app" USING btree ("name");