import { useState, useEffect } from "react";
import {
  Cloud,
  Database,
  Key,
  Check,
  AlertCircle,
  Loader2,
  Save,
  BookOpen,
  Zap,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import {
  type AWSConfig,
  getAWSConfig,
  saveAWSConfig,
  isAWSEnabled,
  setAWSEnabled,
} from "../../services/awsService";

// Dynamic testing helpers (avoiding breaking client startup if AWS fails)
import { getS3Client } from "../../services/awsService";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

export default function AWSSettings() {
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<AWSConfig>({
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: "",
    s3Bucket: "",
    cognitoUserPoolId: "",
    cognitoClientId: "",
    dynamoTable: "",
    lambdaFunctionName: "cloudvault-security-scanner",
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load configuration on mount
  useEffect(() => {
    setEnabled(isAWSEnabled());
    setConfig(getAWSConfig());
  }, []);

  const handleSave = () => {
    saveAWSConfig(config);
    toast.success("AWS Configuration Saved", "Your AWS service credentials have been updated locally.");
  };

  const handleToggle = (val: boolean) => {
    if (val) {
      // Validate config is not completely empty
      if (
        !config.accessKeyId ||
        !config.secretAccessKey ||
        !config.s3Bucket ||
        !config.dynamoTable ||
        !config.cognitoUserPoolId ||
        !config.cognitoClientId
      ) {
        toast.warning(
          "Incomplete Credentials",
          "Please fill in all required credentials and resource names before enabling AWS integration."
        );
        return;
      }
      setAWSEnabled(true);
      setEnabled(true);
      toast.success(
        "AWS Services Enabled",
        "The application is now calling Cognito, S3, and DynamoDB for live operations."
      );
    } else {
      setAWSEnabled(false);
      setEnabled(false);
      toast.info(
        "AWS Services Disabled",
        "The application has reverted to local mock simulation mode."
      );
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // We will perform a quick test by listing buckets using the configured keys.
      // S3 CORS must allow GET requests or at least authenticate correctly.
      const s3 = getS3Client();
      await s3.send(new ListBucketsCommand({}));

      setTestResult({
        success: true,
        message: "Successfully connected to AWS! S3 client successfully authenticated and listed buckets.",
      });
      toast.success("Connection Check Passed", "Successfully authenticated with your AWS account.");
    } catch (err: any) {
      console.error("AWS connection check failed:", err);
      
      // Note: Listing buckets requires access to s3:ListAllMyBuckets which is sometimes omitted.
      // But if we get a CORS error or AccessDenied, it tells us something.
      let errMsg = err.message || "Unknown error";
      if (err.name === "CredentialsProviderError" || err.message?.includes("credentials")) {
        errMsg = "Invalid Access Key ID or Secret Access Key. Please check your credentials.";
      } else if (err.name === "AccessDenied" || err.message?.includes("Access Denied")) {
        errMsg = "Access Denied. Your IAM user policy might be missing S3 permissions.";
      } else if (err.name === "TypeError" && err.message?.includes("fetch")) {
        errMsg = "Network Error / CORS Block. Please verify your S3 CORS configuration or internet connection.";
      }

      setTestResult({
        success: false,
        message: `Connection failed: ${errMsg}`,
      });
      toast.error("Connection Check Failed", errMsg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Toggle Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--cv-text)] flex items-center gap-2">
              <Cloud className="text-primary-500" size={18} />
              AWS Services Cloud Integration
            </h3>
            <p className="text-xs text-[var(--cv-text-secondary)]">
              Toggle between simulated mock data and real AWS cloud services.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--cv-bg-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--cv-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {enabled ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-start gap-2.5">
            <Check className="shrink-0 mt-0.5" size={14} />
            <div>
              <p className="font-bold">AWS Mode Active</p>
              <p className="mt-0.5 leading-relaxed">
                App operations (Authentication, S3 Uploads, and DynamoDB lists) are routed directly to your AWS resources.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="shrink-0 mt-0.5" size={14} />
            <div>
              <p className="font-bold">Simulated Mode Active</p>
              <p className="mt-0.5 leading-relaxed">
                Using mock persistence and client-side simulation. No cloud bills will be generated and credentials are not required.
              </p>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Credentials Form */}
        <Card className="p-6 space-y-4 md:col-span-2">
          <div>
            <h4 className="text-sm font-bold text-[var(--cv-text)]">Configuration Settings</h4>
            <p className="text-[10px] text-[var(--cv-text-muted)]">
              Specify your IAM user keys and resource details.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Region */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)]">
                AWS Region
              </label>
              <input
                type="text"
                value={config.region}
                onChange={(e) => setConfig({ ...config, region: e.target.value })}
                placeholder="e.g. us-east-1"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* S3 Bucket */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)]">
                Amazon S3 Bucket Name
              </label>
              <input
                type="text"
                value={config.s3Bucket}
                onChange={(e) => setConfig({ ...config, s3Bucket: e.target.value })}
                placeholder="e.g. cloudvault-storage-12345"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Access Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                <Key size={10} /> AWS Access Key ID
              </label>
              <input
                type="text"
                value={config.accessKeyId}
                onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                placeholder="AKIA..."
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                <Key size={10} /> AWS Secret Access Key
              </label>
              <input
                type="password"
                value={config.secretAccessKey}
                onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* DynamoDB Table */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                <Database size={10} /> DynamoDB Table Name
              </label>
              <input
                type="text"
                value={config.dynamoTable}
                onChange={(e) => setConfig({ ...config, dynamoTable: e.target.value })}
                placeholder="e.g. cloudvault-metadata"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Cognito User Pool */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                Cognito User Pool ID
              </label>
              <input
                type="text"
                value={config.cognitoUserPoolId}
                onChange={(e) => setConfig({ ...config, cognitoUserPoolId: e.target.value })}
                placeholder="e.g. us-east-1_abCD12"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Cognito Client ID */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                Cognito App Client ID
              </label>
              <input
                type="text"
                value={config.cognitoClientId}
                onChange={(e) => setConfig({ ...config, cognitoClientId: e.target.value })}
                placeholder="e.g. 7abc123def456ghi..."
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Lambda Function Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--cv-text-secondary)] flex items-center gap-1">
                <Zap size={10} /> Lambda Scanner Function Name
              </label>
              <input
                type="text"
                value={config.lambdaFunctionName}
                onChange={(e) => setConfig({ ...config, lambdaFunctionName: e.target.value })}
                placeholder="e.g. cloudvault-security-scanner"
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-xs text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--cv-border)] justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
              leftIcon={testing ? <Loader2 size={12} className="animate-spin" /> : null}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save size={12} />}
            >
              Save Configuration
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex gap-2.5 items-start ${
                testResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              {testResult.success ? (
                <Check className="shrink-0 mt-0.5" size={14} />
              ) : (
                <AlertCircle className="shrink-0 mt-0.5" size={14} />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </Card>

        {/* AWS Bootstrap Guide */}
        <Card className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-[var(--cv-text)] flex items-center gap-1.5">
              <BookOpen size={14} className="text-primary-500" />
              AWS Setup Guide
            </h4>
            <p className="text-[10px] text-[var(--cv-text-muted)]">
              Provision resources in 2 minutes.
            </p>
          </div>

          <div className="text-[10px] text-[var(--cv-text-secondary)] space-y-3 leading-relaxed">
            <p>
              We have provided a fully configured CloudFormation template in the project codebase to spin up S3, DynamoDB, Cognito, and Lambda automatically.
            </p>

            <ol className="list-decimal pl-4 space-y-2">
              <li>
                Open the project directory and locate the template:
                <div className="font-mono bg-[var(--cv-bg-subtle)] p-1 rounded mt-1 select-all border border-[var(--cv-border)] overflow-x-auto text-[9px]">
                  aws-bootstrap/awsBootstrap.yaml
                </div>
              </li>
              <li>
                Sign in to your <strong>AWS Management Console</strong>.
              </li>
              <li>
                Navigate to <strong>CloudFormation</strong> and click <strong>Create Stack</strong> (with new resources).
              </li>
              <li>
                Select <strong>Upload a template file</strong> and select the <code>awsBootstrap.yaml</code> file.
              </li>
              <li>
                Complete the wizard prompts. In the final step, make sure to check the box: 
                <span className="text-[var(--cv-text)] font-semibold"> "I acknowledge that AWS CloudFormation might create IAM resources."</span>
              </li>
              <li>
                Click <strong>Submit</strong>. Once the stack status is <code>CREATE_COMPLETE</code>, go to the <strong>Outputs</strong> tab of the stack.
              </li>
              <li>
                Copy the values and paste them into the configuration inputs on this page, then click save!
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
