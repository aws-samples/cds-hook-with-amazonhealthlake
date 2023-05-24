const cql = require('cql-execution');
const cqlfhir = require('cql-exec-fhir');

const fs = require('fs');
const patientSource = cqlfhir.PatientSource.FHIRv401();


var condition_data = ''
try {
    condition_data = fs.readFileSync('conditions.json', 'utf8');
    //console.log(data);
} catch (err) {
    console.error(err);
}

var fhir_cql_json = ''
try {
    fhir_cql_json = fs.readFileSync('FHIRHelpers.json', 'utf8');
    //console.log(data);
} catch (err) {
    console.error(err);
}
console.log(fhir_cql_json);

const libraries = {
    FHIRHelpers: JSON.parse(String(fhir_cql_json))
};



var diab_cql_json = ''
try {
    diab_cql_json = fs.readFileSync('conjunctivitis-detection-elm.json', 'utf8');
    //console.log(data);
} catch (err) {
    console.error(err);
}
console.log(diab_cql_json);


const elmFile = JSON.parse(String(diab_cql_json));
const library = new cql.Library(elmFile, new cql.Repository(libraries));

//console.log(condition_data);

const bundles = [JSON.parse(condition_data)];

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