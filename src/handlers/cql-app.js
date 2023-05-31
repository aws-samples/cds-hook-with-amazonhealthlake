const path = require('path');
const cql = require('cql-execution');
const cqlfhir = require('cql-exec-fhir');
const cqlvsac = require('cql-exec-vsac');
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");
const { Sha256 } = require("@aws-crypto/sha256-browser");


const AWS = require('aws-sdk');

const HL_DATASTORE_ID = process.env.HL_DATASTORE_ID;
const SMART_APP_ENABLED = process.env.SMART_APP_ENABLED;

const CLOUD9_ENV_ID = process.env.CLOUD9_ENV_ID;

var region = 'us-west-2'; // e.g. us-west-1
var domain = 'healthlake.us-west-2.amazonaws.com'; // e.g. search-domain.region.es.amazonaws.com
const fs = require('fs');


async function getPatientResource(patientId) {
    console.log('Entering new getPatientResource');

    // Create the HTTP request
    var request = new HttpRequest({

        headers: {
            'Content-Type': 'application/json',
            'host': domain
        },
        hostname: domain,
        method: 'GET',
        path: '/datastore/' + HL_DATASTORE_ID + '/r4/Patient',
        query: { "_id": patientId }
    });

    // Sign the request
    var signer = new SignatureV4({
        credentials: defaultProvider(),
        region: region,
        service: 'healthlake',
        sha256: Sha256
    });

    var signedRequest = await signer.sign(request);

    // Send the request
    var client = new NodeHttpHandler();
    var { response } = await client.handle(signedRequest)
    console.log(response.statusCode + ' ' + response.body.statusMessage);
    var responseBody = '';
    await new Promise((resolve) => {
        response.body.on('data', (chunk) => {
            responseBody += chunk;
        });
        response.body.on('end', () => {
            console.log('Response body: ' + responseBody);
            resolve(responseBody);
        });
    }).catch((error) => {
        console.log('Error: ' + error);
    });
    return responseBody;
};




async function getConditionResources(patientId) {
    console.log('Entering new getConditionResources');

    // Create the HTTP request
    var request = new HttpRequest({

        headers: {
            'Content-Type': 'application/json',
            'host': domain
        },
        hostname: domain,
        method: 'GET',
        path: '/datastore/' + HL_DATASTORE_ID + '/r4/Condition',
        query: { "patient": 'Patient/' + patientId }
    });

    // Sign the request
    var signer = new SignatureV4({
        credentials: defaultProvider(),
        region: region,
        service: 'healthlake',
        sha256: Sha256
    });

    var signedRequest = await signer.sign(request);

    // Send the request
    var client = new NodeHttpHandler();
    var { response } = await client.handle(signedRequest)
    console.log(response.statusCode + ' ' + response.body.statusMessage);
    var responseBody = '';
    await new Promise((resolve) => {
        response.body.on('data', (chunk) => {
            responseBody += chunk;
        });
        response.body.on('end', () => {
            console.log('Response body: ' + responseBody);
            resolve(responseBody);
        });
    }).catch((error) => {
        console.log('Error: ' + error);
    });
    return responseBody;
};
exports.runCQLQuery = async(event, context) => {
    console.log(event['body']);



    let fhirJSON = JSON.parse(event['body']);

    //created the same patient in HAPI FHIR
    let patientId = fhirJSON['prefetch']['patient']['identifier'][0]['value'];
    console.log('Patient Id is ' + patientId);

    const patientBundle = await getPatientResource(patientId);
    console.log('FHIR Patient Resource received ' + patientBundle);


    //get Condition resources
    const conditionResource = await getConditionResources(patientId);
    console.log('FHIR Condition Resource received ' + conditionResource);

    const patientResource = JSON.parse(patientBundle)['entry'][0];
    console.log('Extracted patient resource ' + JSON.stringify(patientResource));

    var patientConditionBundle = JSON.parse(conditionResource);
    patientConditionBundle['entry'].push(patientResource);

    console.log('Final bundle ' + JSON.stringify(patientConditionBundle));
    //const pat_data = (await s3.getObject(fhir_patient_params).promise()).Body.toString('utf-8');



    const patientSource = cqlfhir.PatientSource.FHIRv401();


    //var patientConditionJSON = JSON.stringify(patientConditionBundle);


    var fhirCqlJSON = '';
    try {
        fhirCqlJSON = fs.readFileSync('FHIRHelpers.json', 'utf8');
        //console.log(data);
    } catch (err) {
        console.error(err);
    }
    console.log(fhirCqlJSON);

    const libraries = {
        FHIRHelpers: JSON.parse(String(fhirCqlJSON))
    };



    var conjCQLJSON = ''
    try {
        conjCQLJSON = fs.readFileSync('conjunctivitis-detection-elm.json', 'utf8');
        //console.log(data);
    } catch (err) {
        console.error(err);
    }
    console.log(conjCQLJSON);


    const elmFile = JSON.parse(String(conjCQLJSON));
    const library = new cql.Library(elmFile, new cql.Repository(libraries));

    //console.log(condition_data);

    const bundles = [patientConditionBundle];

    patientSource.loadBundles(bundles);

    const executor = new cql.Executor(library);
    console.log('Patient source ' + patientSource);

    const results = executor.exec(patientSource);
    console.log('Results count :' + results.patientResults);


    for (const id in results.patientResults) {
        const result = results.patientResults[id];
        console.log(`${id}:`);
        console.log(`\tHas Conjunctivitis: ${result.hasConjunctivitis}`);
        //console.log(`\tNeedsFootExam: ${result.NeedsFootExam}`);
        //needs_foot_exam = result.NeedsFootExam;
    }
    var cards_json = {
        "cards": [{
                "summary": "Contagious disease CQL Summary",
                "indicator": "severe",
                "detail": "Patient has symptoms of Conjunctivitis.  There are great articles about Conjunctivitis, including:",
                "source": {
                    "label": "Conjunctivitis Label",
                    "url": "https://www.cdc.gov/conjunctivitis/index.html",
                    "icon": "https://www.cdc.gov/conjunctivitis/images/header-sp_vp4.jpg?_=65752"
                },
                "links": [{
                        "label": "Conjunctivitis and Your Eye",
                        "url": "https://www.cdc.gov/conjunctivitis/about/causes.html",
                        "type": "absolute"
                    },
                    {
                        "label": "Conjunctivitis Treatment and Risk Assessment",
                        "url": "https://www.cdc.gov/conjunctivitis/about/treatment.html",
                        "type": "absolute"
                    }

                ]
            }
        ]
    };
    console.log('SMART App Enabled :'+SMART_APP_ENABLED);

    if(SMART_APP_ENABLED == 'true'){
        https://launch.smarthealthit.org/provider-login?response_type=code&client_id=my_web_app&scope=launch+openid+fhirUser+patient%2F*.read&redirect_uri=https%3A%2F%2F8830894197c046b19702804999c9a269.vfs.cloud9.us-west-2.amazonaws.com%3A8080%2Findex.html&aud=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir&state=W1MdlqBDCt1dCL2G&launch=eyJhIjoiMSJ9&code_challenge=goyKI1OHjs6g0aHmfgciggwvTCxqDKmtE60UxT5-J_k&code_challenge_method=S256&login_type=provider
        //the link below is only for us-west-2 and for demo purpose
        const SMART_APP_URL = 'https://'+CLOUD9_ENV_ID+
        '.vfs.cloud9.us-west-2.amazonaws.com:8080/launch.html?launch=eyJhIjoiMSJ9&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir';
        //the below is for r2
        //'.vfs.cloud9.us-west-2.amazonaws.com:8080/launch.html?launch=WzAsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMV0&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr2%2Ffhir';
        
        //the below is example
        //"url": "https://abbd2484e40a4711885cabb895f3303a.vfs.cloud9.us-west-2.amazonaws.com:8080/launch.html?launch=eyJhIjoiMSJ9&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir",
        console.log('Adding SMART Link');
        const smartAppCard = 
        
        {
            "label": "SMART App for specialist referral",
            "url": SMART_APP_URL,
            "type": "absolute"
        }
        cards_json['cards'][0]['links'].push(smartAppCard);
    }

    //get fhir helper resources

    // throw new Error('Something went wrong');
    //return getCardResponse();
    return {

        statusCode: 200,
        headers: {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"

        },
        body: JSON.stringify(cards_json)
    };
};