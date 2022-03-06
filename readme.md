# Cloud GIS ETL

This project is an adapted demo of a production app that performs spatial and tabular data ETL from a DB system into a hosted feature layer.  Its intended use is for live demo and as a reference for attendees to the Harrisburg University 2022 Geo Dev Summit.

Main things that were changed for the demo

- SSM config is no longer used.  Just hard coded URLs to external resources and used Replit's env for app/client secrets.  In PROD you would want to have some sort of config mgmt system like AWS SSM
- Loaded some fake data into a Firebase Realtime DB to simulate the Postgres DB that is used in PROD for this app
- Added many comments and "breakpoints"

# Dependencies

- Node JS (LTS version)
    -   https://nodejs.org/en/
- AWS account
    - https://aws.amazon.com/
- AWS CLI
    - https://aws.amazon.com/cli/
    - run `aws configure` https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS SAM
    - https://aws.amazon.com/serverless/sam/

# Main Files

## Main Handler

`src/app.js` is the entry point to the app and contains the main function.

## GIS Functions

`src/gis/converison.js` - Functions that use `terraformer` to convert bewteen GIS formats such as WKT, GeoJSON, and Esri JSON.  These are fairly modulare and could be reused/extended if desired.

`src/gis/analysis.js` - Functions that use `turf.js` to peform spatial analysis (in this case: converting polys to centroid points, and doing intersect analysis).  These are semi-generic but do contain some specific business logic to this use case so would likely need to be adapated for a different use case.  Hopefully still a helpful reference on working with `turf.js`.

`src/gis/agol.js` - Functions that use `ArcGIS REST JS` to make authenticated calls to perform CRUD operations on AGOL hosted feature layers.  These are quite generic and can be re-used.  Mostly just a light-weight interface to `ArcGIS REST JS` which is already quite easy to use.

## DB Access

`src/db/postgres.js` - Simple wrapper for making DB queries to a Postrgres DB.  The demo has been re-tooled to use a Firebase DB for simplicity, hence the "fakeQuery" function.  Kept this here for reference though.

## Utility

`src/utility/*` - General utility functions and constants, some generic, some sepcific to the app.

## Logic

`src/logic/*` - Core business logic for the app.  Probably not too useful for other use cases.  Also probably hard to follow due to the heavy biz logic and repetitive blocks of field mapping.

## Deployment

`template.yml` and `samconfig.toml` are used to deploy with the `sam deploy` command.  The `samconfig.toml` file has placeholders where you will need to add info for your own AWS account.  You likely can remove references to subnets and security groups in these files.  They are a relic of the production app which hooks up to a Postgres instance in AWS RDS and thus needs access to sec groups/subnets that RDS is in.

# Demo Checklist

1) Go over AGOL resources in the Dev portal
    - private write enabled feature layer
    - public feature layer view
    - web map
    - dashboard
1) Overview of dummy data
    - firebase
    - show in map (AGOL)
1) Overview of core npm packages
    - https://turfjs.org/
    - https://developers.arcgis.com/arcgis-rest-js/
    - https://terraformer-js.github.io/
1) Overview of source code
1) Step by step through `app.js` and call out relevant functions in helper libs
1) Show data flowing into AGOL feature layer

## Get started

Run `npm install` to gather dependencies.

Run `npm start` to run the main function in app.js.

You can debug locally using `npm start`.  Deploying to AWS is optional and requires an AWS account and some setup in the `template.yml` and `samconfig.toml`.

More info on SAM setup can be found:
https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy.html

To deploy, run `sam deploy` from a command prompt once the above files have been configured.

Alternatively you can run `sam deploy --guided` to get a CLI wizard to help you deploy.


