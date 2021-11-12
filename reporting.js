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

const mutation = gql`
  mutation SubmissionReport(
    $submissionId: ID!
    $description: String!
    $status: SubmissionReportStatus!
  ) {
    createSubmissionReports(
      submissionId: $submissionId
      description: $description
      status: $status
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

if (reportFilePath != "") {
  try {
    reportData = JSON.parse(
      fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, reportFilePath))
    );
  } catch (error) {
    throw error;
  }
}

const reportStatus = statusInput != "" ? statusInput : reportData.status;

const reportDescription =
  descriptionInput != "" ? descriptionInput : reportData.report;

const validStatuses = ["error", "failure", "pending", "success"];

let validStatus = (status) => {
  return validStatuses.includes(status);
};

if (!validStatus(reportStatus)) {
  reportStatus = "error";
  reportDescription =
    "Something went wrong with the tests! Please check the workflow";
}

const variables = {
  submissionId: submissionData.id,
  description: reportDescription,
  status: reportStatus,
};

async function run() {
  if (reportStatus != undefined && reportDescription != undefined) {
    const data = await graphQLClient.request(mutation, variables);
    console.log(JSON.stringify(data, undefined, 2));
  } else {
    throw "Report status or description missing";
  }
}

let testMode = core.getBooleanInput("test_mode");

if (testMode) {
  console.log(reportData);
  console.log(submissionData);
} else {
  run().catch((error) => console.log(error));
}
