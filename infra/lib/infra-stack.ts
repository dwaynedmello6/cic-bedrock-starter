import * as path from "path";
import { Duration, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // You can change this later via context/env
    const bedrockRegion = this.region; // use stack region by default
    const modelId = "us.amazon.nova-2-lite-v1:0";

    const fn = new lambdaNodejs.NodejsFunction(this, "BedrockInvokeFn", {
      entry: path.join(__dirname, "../../services/api/src/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(20),
      memorySize: 512,
      environment: {
        BEDROCK_REGION: bedrockRegion,
        MODEL_ID: modelId,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: {
        externalModules: [
          // AWS SDK v3 is bundled unless you externalize; we keep it bundled for simplicity
        ],
      },
    });

    // Least-privilege Bedrock permission (invoke only)
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"], // You can restrict later to specific model ARN(s)
      })
    );

    // REST API
    const api = new apigw.RestApi(this, "BedrockStarterApi", {
      restApiName: "cic-bedrock-starter",
      deployOptions: {
        stageName: "dev",
        throttlingRateLimit: 5,  // req/sec default limit (stage)
        throttlingBurstLimit: 10, // short bursts
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ["POST", "OPTIONS"],
      },
    });

    const invoke = api.root.addResource("invoke");

    // Require API key
    const apiKey = api.addApiKey("DevApiKey", {
      apiKeyName: "cic-bedrock-starter-dev-key",
      // For a demo/dev build it’s fine to set a fixed value:
      value: "dev-demo-key-change-me",
    });

    const plan = api.addUsagePlan("UsagePlan", {
      name: "dev-plan",
      throttle: { rateLimit: 5, burstLimit: 10 },
      quota: { limit: 5000, period: apigw.Period.DAY },
    });

    plan.addApiKey(apiKey);
    plan.addApiStage({ stage: api.deploymentStage });

    const integration = new apigw.LambdaIntegration(fn, { proxy: true });

    invoke.addMethod("POST", integration, {
      apiKeyRequired: true,
    });

    new CfnOutput(this, "InvokeUrl", {
      value: `${api.url}invoke`,
    });

    new CfnOutput(this, "ApiKeyValue_DEV_ONLY", {
      value: "dev-demo-key-change-me",
    });
  }
}