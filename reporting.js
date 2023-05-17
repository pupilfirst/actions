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
    $report: String
    $status: SubmissionReportStatus!
    $reporter: String!
    $heading: String
  ) {
    concludeSubmissionReport(
      submissionId: $submissionId
      report: $report
      status: $status
      reporter: $reporter
      heading: $heading
    ) {
      success
    }
  }
`;

const inProgressSubmissionReportQuery = gql`
  mutation InProgressSubmissionReport(
    $submissionId: ID!
    $report: String
    $reporter: String!
    $heading: String
  ) {
    beginProcessingSubmissionReport(
      submissionId: $submissionId
      report: $report
      reporter: $reporter
      heading: $heading
    ) {
      success
    }
  }
`;

const queuedSubmissionReportQuery = gql`
  mutation QueuedSubmissionReport(
    $submissionId: ID!
    $report: String
    $reporter: String!
    $heading: String
  ) {
    queueSubmissionReport(
      submissionId: $submissionId
      report: $report
      reporter: $reporter
      heading: $heading
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

const descriptionInput = core.getInput("description");

// Check for report data
let reportData;
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

  let report =
    grading == "reject"
      ? "Submission will be eventually rejected and feedback will be shared"
      : "";

  return report;
};

let truncateReport = (reportText) => {
  if (typeof reportText !== "string") {
    return reportText;
  }

  if (reportText.length > 10000) {
    return (
      "Report has been truncated because it was longer than 10,000 chars:\n\n---\n\n" +
      reportText.substring(0, 9900)
    );
  } else {
    return reportText;
  }
};

let reportStatus = statusInput;

if (reportData != undefined) {
  reportStatus = reportData.status;
  reportDescription =
    truncateReport(reportData.report) ||
    descriptionInput ||
    reportIfGraded(reportData) ||
    "Test report unavailable";
} else {
  reportDescription = descriptionInput || "Test report unavailable";
}

let variables = {
  submissionId: submissionData.id,
  report: reportDescription,
  status: reportStatus,
  reporter: "Virtual Teaching Assistant",
};

async function run() {
  let mutation;
  switch (statusInput) {
    case "queued":
      mutation = queuedSubmissionReportQuery;
      variables.heading = "Automated tests are queued";
      break;
    case "in_progress":
      mutation = inProgressSubmissionReportQuery;
      variables.heading = "Automated tests are in progress";
      break;
    case "error":
      mutation = completedSubmissionReportQuery;
      variables.heading = "Automated tests passed";
      variables.status = "error";
      break;
    case "failure":
      mutation = completedSubmissionReportQuery;
      variables.heading = "Automated tests failed";
      variables.status = "failure";
      break;
    case "success":
      mutation = completedSubmissionReportQuery;
      variables.heading = "Automated tests passed";
      variables.status = "success";
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
  console.log(reportData);
  run().catch((error) => console.log(error));
}
