This repository holds all the Github actions associated with the Pupilfirst LMS and its APIs.


# List of Actions

- **Puplifirst Reporting**: This action is used to report the status of the automated tests to the LMS. 
  
- **Pupilfirst Grading**: This action is used to grade a submission in the LMS. 

For a list of recent changes, see the Pupilfirst actions' [changelog](CHANGELOG.md).

## Usage

#### Pupilfirst Reporting Action

The reporting action accepts three inputs - `report_file_path`, `status` and `description` . The `status` and `description` is specifically useful to report to the LMS that a test has begun in the automated system. The action expects the `REVIEW_END_POINT` and `REVIEW_BOT_USER_TOKEN` as env , the first being the GraphQL API endpoint of your school and the latter being the user token for the user created for bot actions. It is recommended to keep both of these as secrets. Here is a basic example:

```yaml
  ## Using the reporting action with status and description supplied as input
  - name: Report to LMS tests in progress
    uses: pupilfirstr/actions/reporting@v1
    with:
      status: "pending" ## Valid status inputs are pending, success, failure, error
      description: "The automated tests are in progress"
    env:
      REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }} ## GraphQL API endpoint for your school in the LMS
      REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }} ## User API token of the review bot user.
```

In the absence of `status` and `description` inputs to the action, the action expects a `report.json` file in the checked out repository to complete the reporting. The `report_file_path` should be supplied accurately - which is the relative path to the file in the checked out repository. The `report.json` should have the keys `report` which stores the report description and `status` which stores the status to be reported. In the absence of a valid `report.json` or inputs directly to the action, an error will be reported to the LMS. Ensure that your automated tests generate a `report.json` output with the said keys before the reporting step. Here is an example of using the action without `status` and `description` input:

```yaml
  ## Using the reporting action without status and description supplied as input
  - name: Report to LMS tests in progress
    uses: pupilfirstr/actions/reporting@v1
    with:
      report_file_path: "submission/report.json" ## File path when the report.json is in submission directory in the checked out repo
    env:
      REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }} ## GraphQL API endpoint for your school in the LMS
      REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }} ## User API token of the review bot user.
```

In the presence of `status` and `description` inputs to the action, the values in `report.json` will be ignored if present.

#### Pupilfirst Grading Action

The grading action accepts a single input `report_file_path` which is the relative path to the `report.json` file in the checked out repository. The `report.json` should have the keys `feedback` which stores the feedback for the submission and `status` which determines whether to pass, fail or skip grading. The action expects the `REVIEW_END_POINT` and `REVIEW_BOT_USER_TOKEN` as env , the first being the GraphQL API endpoint of your school and the latter being the user token for the user created for bot actions. It is recommended to keep both of these as secrets. Here is a basic example:

```yaml
  ## Using the grading action to review a submission in the LMS
  - name: Grade a submission in the LMS
    uses: pupilfirstr/actions/grading@v1
    with:
      report_file_path: "submission/report.json" ## File path when the report.json is in submission directory in the checked out repo
    env:
      REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }} ## GraphQL API endpoint for your school in the LMS
      REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }} ## User API token of the review bot user.
```

The valid statuses for grading in `report.json` file are `skip`, `pass`, `fail`. In the absence of a valid `report.json` file or valid `status` keys or missing `feedback`, grading will be skipped. 

Both actions outputs the response from the LMS if any to the logs. 

