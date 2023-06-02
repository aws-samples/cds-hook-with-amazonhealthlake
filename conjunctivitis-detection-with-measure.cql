library LibraryOne version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "SNOMEDCT": 'http://snomed.info/sct'

code "Red eye (finding)": '703630003' from "SNOMEDCT" display 'redeye mellitus type 2 (disorder)'

code "Discharge from eye (finding)": '246679005' from "SNOMEDCT" display 'redeye mellitus type 2 (disorder)'

context Patient


define RedEye:
  exists(
    [Condition: "Red eye (finding)"]
  )

define EyeDischarge:
  exists(
    [Condition: "Discharge from eye (finding)"]
  )

define "observations":
       [Observation]O

define isHighRisk:
  observations.value.value.value = 6.3

define "hasConjunctivitis":
  RedEye and EyeDischarge and isHighRisk