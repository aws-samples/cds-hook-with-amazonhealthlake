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