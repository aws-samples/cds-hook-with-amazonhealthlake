Instance: Alice
InstanceOf: Patient
* name.family = "Green"
* name.given[0] = "Alice"
* gender = #female
* birthDate = "1951-01-20"


Instance: AlicesRedEyeCondition
InstanceOf: Condition
* code = http://snomed.info/sct#703630003 "Red eye (finding)"
* subject = Reference(Alice)
* onsetDateTime = "2015-01-30"

Instance: AlicesEyeDischarge
InstanceOf: Condition
* code = http://snomed.info/sct#246679005 "Discharge from eye (finding)"
* subject = Reference(Alice)
* onsetDateTime = "2015-01-30"


Instance: 3bd66ae8-b80c-4ed5-839c-71d19d259ad3
InstanceOf: Observation
* code = http://loinc.org#15074-8 "Glucose [Moles/volume] in Blood"
* subject = Reference(Alice)
* code.text = "glucose level"
* effectiveDateTime = "2018-09-06T14:11:10-07:00"
* issued = "2018-09-06T14:11:10.638-07:00"
* valueQuantity = 6.3 'mmol/L' "mmol/l"
* referenceRange.low = 3.1 'mmol/L' "mmol/l"
* referenceRange.high = 6.2 'mmol/L' "mmol/l"