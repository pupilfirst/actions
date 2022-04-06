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
  mutation GradeSubmission(
    $submissionId: ID!
    $grades: [GradeInput!]!
    $checklist: JSON!
    $feedback: String
  ) {
    createGrading(
      submissionId: $submissionId
      grades: $grades
      checklist: $checklist
      feedback: $feedback
    ) {
      success
    }
  }
`;

let submissionData;

try {
  submissionData = JSON.parse(
    fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, "submission.json"))
  );
} catch (error) {
  throw error;
}

const reportFilePath = core.getInput("report_file_path");

const fail_submission = core.getBooleanInput("fail_submission");

const feedbackInput = core.getInput("feedback");

let reportData;
let passed;
let skip;

if (fail_submission) {
  reportData = {};
} else if (reportFilePath != "") {
  try {
    reportData = JSON.parse(
      fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, reportFilePath))
    );
  } catch (error) {
    throw error;
  }
} else {
  throw "Either report file path should be provide or fail submission should be used";
}

const validStatuses = ["success", "failure", "error"];

let validStatus = (status) => {
  return validStatuses.includes(status);
};

if (reportData) {
  passed = reportData.status == "success";

  skip = reportData.grade == "skip";
}

const grades = submissionData["target"]["evaluation_criteria"].map((ec) => {
  let ecGrade = {};
  ecGrade["evaluationCriterionId"] = ec.id;
  if (fail_submission) {
    ecGrade["grade"] = ec.pass_grade - 1;
  } else if (reportData) {
    ecGrade["grade"] = passed ? ec.pass_grade : ec.pass_grade - 1;
  } else {
    throw "Could not determine pass or fail status of the submission";
  }

  return ecGrade;
});

const variables = {
  submissionId: submissionData.id,
  grades: grades,
  checklist: submissionData.checklist,
  feedback: reportData.feedback || feedbackInput,
};

async function run() {
  if (fail_submission || (!skip && validStatus(reportData.status))) {
    const data = await graphQLClient.request(mutation, variables);
    console.log(JSON.stringify(data, undefined, 2));
  } else {
    console.log("Skipped grading");
  }
}

let testMode = core.getBooleanInput("test_mode");

if (testMode) {
  console.log(submissionData);
  console.log(reportData);
} else {
  run().catch((error) => console.log(error));
}
