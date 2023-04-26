This repository holds all the Github actions associated with the Pupilfirst LMS and its APIs.

## List of Actions

- **Reporting**: This action is used to report the status of the automated tests to the LMS.
- **Grading**: This action is used to grade a submission in the LMS.
- **Check Repo**: A composite action used to fetch a GitHub URL from a student submission and to verify presence of certain paths in it.

## How to release

When releasing a new version, you should always push two tags - the full version tag - `v1.2.3` for example, and the corresponding major version tag - `v1`, for `v1.2.3`. You will need to delete the existing major version tag, and push a replacement tag for each release.

```bash
# Delete the old local tag, and create it anew.
git tag -d v1
git tag v1
git tag v1.2.3

# Delete the old tag on origin before pushing updated ones.
git push origin :refs/tags/v1
git push origin v1
git push origin v1.2.3
```

## Usage

### Check Repo

When a student submission contains a URL to a GitHub repository, the `check_repo` action can be used to clone it and check for the presence of required files or folders.

To fetch the repo URL, the action makes the assumption that the first question in the target checklist is asking for the GitHub repo URL. The following steps are performed:

1. The action will validate the repo URL (that it is, indeed, a GitHub repo URL), and then clones it. By default, it clones to the root path, but this can be customized using the `repoPath` input.
2. It then checks for the presence of files and folders specified using the `globs` input array.

If any failure occurs during these checks, the student's submission will be rejected with appropriate feedback. To avoid sending any reports to the LMS, set the `testMode` input to `true`.

### Reporting

The reporting action accepts three inputs - `report_file_path`, `status` and `description` . The `status` and `description` is specifically useful to report to the LMS that a test has begun in the automated system. The action expects the `REVIEW_END_POINT` and `REVIEW_BOT_USER_TOKEN` as env , the first being the GraphQL API endpoint of your school and the latter being the user token for the user created for bot actions. It is recommended to keep both of these as secrets. Here is a basic example:

```yaml
# Using the reporting action with status and description supplied as input.
- name: Report to LMS tests in progress
  uses: pupilfirstr/actions/reporting@v1
  with:
    # Valid status inputs are pending, success, failure, error.
    status: "pending"
    description: "The automated tests are in progress"
  env:
    # GraphQL API endpoint for your school in the LMS.
    REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }}
    # User API token of the review bot user.
    REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }}
```

In the absence of `status` and `description` inputs to the action, the action expects a `report.json` file in the checked out repository to complete the reporting. The `report_file_path` should be supplied accurately - which is the relative path to the file in the checked out repository. The `report.json` should have the keys `report` which stores the report description and `status` which stores the status to be reported. In the absence of a valid `report.json` or inputs directly to the action, an error will be reported to the LMS. Ensure that your automated tests generate a `report.json` output with the said keys before the reporting step. Here is an example of using the action without `status` and `description` input:

```yaml
# Using the reporting action without status and description supplied as input.
- name: Report to LMS tests in progress
  uses: pupilfirstr/actions/reporting@v1
  with:
    # File path when the report.json is in submission directory in the checked out repo.
    report_file_path: "submission/report.json"
  env:
    # GraphQL API endpoint for your school in the LMS.
    REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }}
    # User API token of the review bot user.
    REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }}
```

In the presence of `status` and `description` inputs to the action, the values in `report.json` will be ignored if present.

### Grading

The grading action accepts a single input `report_file_path` which is the relative path to the `report.json` file in the checked out repository. The `report.json` should have the keys `feedback` which stores the feedback for the submission and `status` which determines whether to pass, fail or skip grading. The action expects the `REVIEW_END_POINT` and `REVIEW_BOT_USER_TOKEN` as env , the first being the GraphQL API endpoint of your school and the latter being the user token for the user created for bot actions. It is recommended to keep both of these as secrets. Here is a basic example:

```yaml
# Using the grading action to review a submission in the LMS.
- name: Grade a submission in the LMS
  uses: pupilfirstr/actions/grading@v1
  with:
    # File path when the report.json is in submission directory in the checked out repo.
    report_file_path: "submission/report.json"
  env:
    # GraphQL API endpoint for your school in the LMS.
    REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }}
    # User API token of the review bot user.
    REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }}
```

The valid statuses for grading in `report.json` file are `skip`, `pass`, `fail`. In the absence of a valid `report.json` file or valid `status` keys or missing `feedback`, grading will be skipped.

Both actions outputs the response from the LMS if any to the logs.
