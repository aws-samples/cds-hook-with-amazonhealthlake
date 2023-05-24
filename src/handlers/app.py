import json
import boto3
from jsonpath_ng.ext import parse
import requests
from requests_auth_aws_sigv4 import AWSSigV4
import os

# import requests

client = boto3.client('comprehendmedical')
hl_datastore_id = os.environ.get('HL_DATASTORE_ID')


def get_cds_services(event, context):
    print(event)

    return {
        "statusCode": 200,
        "headers": {

            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"

        },
        "body": json.dumps({
            "services": [
                {
                    "hook": "patient-view",
                    "name": "cql-executor",
                    "description": "Curated CQL execution results for demo. Returns results for Conjunctivitis detection.",
                    "id": "cql-executor",
                          "prefetch": {
                              "patient": "Patient/{{context.patientId}}",
                              "condition": "Condition?patient={{context.patientId}}"
                          }
                },
            ]
        }),
    }


def add_patient_notes(event, context):
    print('The event body '+event['body'])
    # create patient resource
    patient_json = {

        "resourceType": "Patient",
        "name": [{

            "given": [

            ]
        }],


        "meta": {
            "lastUpdated": "2023-04-11T06:34:34.240Z"
        }

    }

    # print(patient_json['resource']['name'][0]['family'])
    event_body_json = json.loads(event['body'])
    print('The event body json '+event_body_json['lastName'])
    patient_json['name'][0]['family'] = event_body_json['lastName']
    patient_json['name'][0]['given'].append(
        event_body_json['firstName'])
    patient_json['gender'] = event_body_json['gender']
    patient_json['birthDate'] = event_body_json['birthDate']
    print('Updated patient json'+str(patient_json))
    notes = event_body_json['notes']
    print('notes '+notes)
    cm_response = client.infer_snomedct(
        Text=notes
    )
    print('CM Response')
    print(json.dumps(cm_response).replace('\'', '"'))
    cm_response_conv_quote = json.dumps(cm_response).replace('\'', '"')
    cm_response_json = json.loads(cm_response_conv_quote)

    is_conjuctivitis_symptom = False
    jsonpath_expression = parse(
        "$..SNOMEDCTConcepts[?(@.Code =~ '703630003')].Description")
    for match in jsonpath_expression.find(cm_response_json):
        print('The matched value')
        print(match.value)
        is_conjuctivitis_symptom = True

    if is_conjuctivitis_symptom:
        print('Creating patient and condition in Healthlake')
        create_patient_and_condition(patient_json)
    # print('Patient JSON')
    # print(patient_json)
    return {
        'statusCode': 201,
        'headers': {},
        'body': json.dumps(patient_json)
    }


def create_patient_and_condition(patient):

    condition_resource_discharge = {

        "resourceType": "Condition",

        "meta": {
            "lastUpdated": "2023-04-11T06:36:18.974Z",
            "source": "#2fc9ee4c29f0eff4"
        },
        "code": {
            "coding": [{
                "system": "http://snomed.info/sct",
                "code": "246679005",
                "display": "Discharge from eye (finding)"
            }]
        },
        "subject": {

        },
        "onsetDateTime": "2019-07-30T01:00:00.000-05:00"

    }
    condition_resource_red_eye = {

        "resourceType": "Condition",

        "meta": {
            "lastUpdated": "2023-04-11T06:34:51.322Z",
            "source": "#2fc9ee4c29f0eff4"
        },
        "code": {
            "coding": [{
                "system": "http://snomed.info/sct",
                "code": "703630003",
                "display": "Red eye (finding)"
            }]
        },
        "subject": {

        },
        "onsetDateTime": "2019-07-30T01:00:00.000-05:00"
    }

    headers = {'content-type': 'application/json+fhir'}

    aws_auth = AWSSigV4(service='healthlake', region=os.environ.get('AWS_REGION'),
                        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                        aws_secret_access_key=os.environ.get(
                            'AWS_SECRET_ACCESS_KEY'),
                        aws_session_token=os.environ.get('AWS_SESSION_TOKEN')
                        )

    print(json.dumps(patient))
    hl_response = requests.request('POST', 'https://healthlake.us-west-2.amazonaws.com/datastore/'+hl_datastore_id+'/r4/Patient',
                                   auth=aws_auth, data=json.dumps(patient), headers=headers)
    response_body = hl_response.json()
    patient_id = response_body['id']
    print(response_body['id'])

    # update the patient resource with id in the identifier tag. This is done for the replicating data in HAPI for demo
    patient['identifier'] = [{
        "value": patient_id
    }]
    patient['id'] = patient_id
    print('Updated patient resource')
    print(json.dumps(patient))
    hl_response = requests.request('PUT', 'https://healthlake.us-west-2.amazonaws.com/datastore/'+hl_datastore_id+'/r4/Patient/'+patient_id,
                         auth=aws_auth, data=json.dumps(patient), headers=headers)
    
    response_body = hl_response.json()
    #patient_id = response_body['id']
    print(response_body)


    headers["patient-id"] = patient_id
    headers["condition-type"] = "Contagious"

    condition_resource_discharge['subject']['reference'] = 'Patient/'+patient_id
    condition_resource_red_eye['subject']['reference'] = 'Patient/'+patient_id
    hl_response = requests.request('POST', 'https://healthlake.us-west-2.amazonaws.com/datastore/'+hl_datastore_id+'/r4/Condition',
                                   auth=aws_auth, data=json.dumps(condition_resource_discharge), headers=headers)
    print(hl_response)
    hl_response = requests.request('POST', 'https://healthlake.us-west-2.amazonaws.com/datastore/'+hl_datastore_id+'/r4/Condition',
                                   auth=aws_auth, data=json.dumps(condition_resource_red_eye), headers=headers)
    print(hl_response)
