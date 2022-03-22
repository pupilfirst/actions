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
    $description: String!
    $conclusion: SubmissionReportConclusion!
  ) {
    createCompletedSubmissionReport(
      submissionId: $submissionId
      description: $description
      conclusion: $conclusion
    ) {
      success
    }
  }
`;

const inProgressSubmissionReportQuery = gql`
  mutation InProgressSubmissionReport(
    $submissionId: ID!
    $description: String!
  ) {
    createInProgressSubmissionReport(
      submissionId: $submissionId
      description: $description
    ) {
      success
    }
  }
`;

const queuedSubmissionReportQuery = gql`
  mutation QueuedSubmissionReport($submissionId: ID!, $description: String!) {
    createQueuedSubmissionReport(
      submissionId: $submissionId
      description: $description
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

const conclusionInput = core.getInput("conclusionInput");

const descriptionInput = core.getInput("description");

// Check for report data
let reportData;

if (reportFilePath != "") {
  try {
    reportData = JSON.parse(
      fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, reportFilePath))
    );
  } catch (error) {
    throw error;
  }
}

let reportConclusion =
  conclusionInput != "" ? conclusionInput : reportData.conclusion;

let reportDescription =
  descriptionInput != "" ? descriptionInput : reportData.report;

const validConclusions = ["success", "error", "failure"];

let validConclusion = (conclusion) => {
  return validConclusions.includes(conclusion);
};

let variables = {
  submissionId: submissionData.id,
  description: reportDescription,
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
      if (validConclusion(reportConclusion)) {
        variables.conclusion = reportConclusion;
      } else {
        throw "Invalid conclusion for completed status";
      }

      break;
    default:
      throw "Invalid submission report status";
  }

  if (reportDescription != undefined) {
    const data = await graphQLClient.request(mutation, variables);
  } else {
    throw "Invalid report description";
  }
}

let testMode = core.getBooleanInput("test_mode");

if (testMode) {
  console.log(reportData);
  console.log(submissionData);
} else {
  run().catch((error) => console.log(error));
}
