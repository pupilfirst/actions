const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

const GraphQLClient = require("graphql-request").GraphQLClient;
const gql = require("graphql-request").gql;

const endpoint = process.env.REVIEW_END_POINT;

const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${process.env.REVIEW_BOT_USER_TOKEN}`,
  },
});

const completedSubmissionReportQuery = gql`
  mutation CompletedSubmissionReport(
    $submissionId: ID!
    $testReport: String
    $conclusion: SubmissionReportConclusion!
  ) {
    concludeSubmissionReport(
      submissionId: $submissionId
      testReport: $testReport
      conclusion: $conclusion
    ) {
      success
    }
  }
`;

const inProgressSubmissionReportQuery = gql`
  mutation InProgressSubmissionReport($submissionId: ID!, $testReport: String) {
    beginProcessingSubmissionReport(
      submissionId: $submissionId
      testReport: $testReport
    ) {
      success
    }
  }
`;

const queuedSubmissionReportQuery = gql`
  mutation QueuedSubmissionReport($submissionId: ID!, $testReport: String) {
    queueSubmissionReport(
      submissionId: $submissionId
      testReport: $testReport
    ) {
      success
    }
  }
`;

// Parse student submission data
let submissionData;

try {
  submissionData = JSON.parse(
    fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, "submission.json"))
  );
} catch (error) {
  throw error;
}

// Parse inputs to the action
const reportFilePath = core.getInput("report_file_path");

const statusInput = core.getInput("status");

const conclusionInput = core.getInput("conclusion");

const descriptionInput = core.getInput("description");

// Check for report data
let reportData;
let reportConclusion;
let reportDescription;

if (reportFilePath != "") {
  try {
    reportData = JSON.parse(
      fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, reportFilePath))
    );
  } catch (error) {
    throw error;
  }
}

let reportIfGraded = (reportData) => {
  let grading = reportData.grading;

  let testReport =
    grading == "reject"
      ? "Submission will be eventually rejected and feedback will be shared"
      : "";

  return testReport;
};

if (reportData != undefined) {
  reportConclusion = reportData.status;
  reportDescription =
    reportData.report ||
    descriptionInput ||
    reportIfGraded(reportData) ||
    "Test report unavailable";
} else {
  reportConclusion = conclusionInput;
  reportDescription = descriptionInput || "Test report unavailable";
}

let reportStatus = statusInput;

const validConclusions = ["success", "error", "failure"];

let validConclusion = (conclusion) => {
  return validConclusions.includes(conclusion);
};

let variables = {
  submissionId: submissionData.id,
  testReport: reportDescription,
  status: reportStatus,
};

async function run() {
  let mutation;
  switch (statusInput) {
    case "queued":
      mutation = queuedSubmissionReportQuery;
      break;
    case "in_progress":
      mutation = inProgressSubmissionReportQuery;
      break;
    case "completed":
      mutation = completedSubmissionReportQuery;
      if (validConclusion(reportConclusion) && reportDescription != undefined) {
        variables.conclusion = reportConclusion;
      } else {
        throw "Invalid conclusion for completed status or missing description";
      }

      break;
    default:
      throw "Invalid submission report status";
  }

  const data = await graphQLClient.request(mutation, variables);
  console.log(JSON.stringify(data, undefined, 2));
}

let testMode = core.getBooleanInput("test_mode");

if (testMode) {
  console.log(reportData);
  console.log(submissionData);
} else {
  run().catch((error) => console.log(error));
}
