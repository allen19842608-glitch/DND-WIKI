# Chapter 6: Magical Creatures

[A baelnorn gifts a brass dragon a scroll containing ancient magical knowledge.](https://5e.tools/img/book/AU/070-06-001.ch-6-splash.webp)

Use the following creatures to populate your magic-themed campaigns. Consult the Monster Manual for additional details on monsters. Creatures are presented here in alphabetical order.

## Archmages

*Masters of Magic*

- #### Habitat:
  
  Any
- #### Treasure:
  
  Arcana, Individual

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Archmages

> Source: AU

*Masters of Magic*

Although all archmages have mastered incredible magical power, some specialize in a particular school of magic, pushing their abilities to greater heights in that area. These archmages stock their spellbooks with spells from their preferred school and have developed unique magical techniques.

Immense and specialized magical prowess isn't an end in its own right. It's how one uses their power that matters.

— Alustriel

[Archmages from Each School of Magic: 1. Conjurer 2. Abjurer 3. Necromancer 4. Illusionist 5. Diviner 6. Enchanter 7. Transmuter 8. Evoker](https://5e.tools/img/bestiary/AU/Archmages.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Abjurer Archmage

> Source: AU, p. 135

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes three Arcane Burst attacks.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:27 (4d10 + 5) Force damage.

##### Banishing Blast Recharge 6

cha DC 18, each creature in a 60-foot Cone. Failure: 45 (10d8) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the archmage's next turn, at which point it reappears in the space it left or in the nearest unoccupied space if that space is occupied. Success: Half damage only.

#### Bonus Actions

##### Fortify 4

The archmage magically bolsters itself. The archmage gains 40 Temporary Hit Points.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Arcane Lock|XPHB}",
    "{@spell Detect Magic|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Fireball|XPHB} (level 7 version)",
      "{@spell Nondetection|XPHB}",
      "{@spell Otiluke's Resilient Sphere|XPHB}"
    ],
    "1e": [
      "{@spell Mind Blank|XPHB} (cast before combat)",
      "{@spell Teleport|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Magic Disruption (2/Day)

###### Description

The archmage casts Dispel Magic or Globe of Invulnerability, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "2": [
      "{@spell Dispel Magic|XPHB}",
      "{@spell Globe of Invulnerability|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Counterspell (3/Day)

###### Description

The archmage casts Counterspell in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 135,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 198,
    "formula": "36d8 + 36"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "perception": "+7"
  },
  "passive": 17,
  "immune": [
    "psychic"
  ],
  "conditionImmune": [
    "charmed"
  ],
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "staff|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "F",
    "O"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "conditionInflict": [
    "incapacitated"
  ],
  "savingThrowForced": [
    "charisma"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Conjurer Archmage

> Source: AU, p. 136

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:27 (4d10 + 5) Force damage.

#### Bonus Actions

##### Benign Transposition (3/Day)

The archmage teleports up to 30 feet to an unoccupied space that it can see. If it instead chooses a space within range that is occupied by a willing creature, they both teleport, swapping places.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Find Familiar|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}",
    "{@spell Unseen Servant|XPHB}"
  ],
  "daily": {
    "2": [
      "{@spell Dimension Door|XPHB}"
    ],
    "1e": [
      "{@spell Incendiary Cloud|XPHB}",
      "{@spell Lightning Bolt|XPHB} (level 8 version)",
      "{@spell Plane Shift|XPHB}",
      "{@spell Teleport|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 136,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 225,
    "formula": "41d8 + 41"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "perception": "+7"
  },
  "passive": 17,
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "crystal|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "F",
    "L",
    "O"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Diviner Archmage

> Source: AU, p. 137

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and similar effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks. It can replace one attack with a use of Spellcasting to cast Mind Spike (level 4 version).

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:24 (3d12 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Detect Thoughts|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Mind Spike|XPHB} (level 4 version)",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Scrying|XPHB}",
      "{@spell Sending|XPHB}"
    ],
    "1e": [
      "{@spell Foresight|XPHB} (cast before combat)",
      "{@spell Telepathy|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 137,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 176,
    "formula": "32d8 + 32"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "insight": "+7",
    "investigation": "+10",
    "perception": "+7"
  },
  "passive": 17,
  "languages": [
    "all"
  ],
  "cr": "15",
  "gear": [
    "staff|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "XX"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "Y"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Enchanter Archmage

> Source: AU, p. 137

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst Attacks.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:21 (3d10 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Fireball|XPHB} (level 7 version)",
      "{@spell Geas|XPHB}",
      "{@spell Modify Memory|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Dominate Person (1/Day)

###### Description

The archmage casts Dominate Person, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "1": [
      "{@spell Dominate Person|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Duplicitous Magic (2/Day)

###### Description

The archmage casts Charm Person, Hold Person, or Sleep, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "2": [
      "{@spell Charm Person|XPHB}",
      "{@spell Hold Person|XPHB}",
      "{@spell Sleep|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 137,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 214,
    "formula": "39d8 + 39"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "perception": "+7",
    "persuasion": "+13"
  },
  "passive": 17,
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "staff|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "F",
    "Y"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "conditionInflictSpell": [
    "charmed",
    "incapacitated",
    "paralyzed",
    "unconscious"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Evoker Archmage

> Source: AU, p. 138

#### Traits

##### Evocation Sculptor

When the archmage casts a spell that creates an area of effect, it can choose itself and up to five other creatures it can see, sculpting the spell's energy around them. A chosen creature automatically succeeds on its saving throw against the spell, and it takes no damage if it would normally take half damage on a successful save.

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks. It can replace one attack with a use of Spellcasting to cast Shatter.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:27 (4d10 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}",
    "{@spell Shatter|XPHB} (level 3 version)"
  ],
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Evocation Barrage 5

###### Description

The archmage casts Fireball, Ice Storm, or Lightning Bolt twice in any combination, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "recharge": {
    "5": [
      "{@spell Fireball|XPHB}",
      "{@spell Ice Storm|XPHB}",
      "{@spell Lightning Bolt|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action",
  "hidden": [
    "recharge"
  ]
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 138,
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 214,
    "formula": "39d8 + 39"
  },
  "speed": {
    "walk": 30,
    "fly": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "intimidation": "+8",
    "perception": "+7"
  },
  "passive": 17,
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "orb|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "B",
    "C",
    "F",
    "L",
    "T"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Illusionist Archmage

> Source: AU, p. 138

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:21 (3d10 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Disguise Self|XPHB}",
    "{@spell Invisibility|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Minor Illusion|XPHB}",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Creation|XPHB}",
      "{@spell Major Image|XPHB}",
      "{@spell Nystul's Magic Aura|XPHB}",
      "{@spell Seeming|XPHB}"
    ],
    "1e": [
      "{@spell Mirage Arcane|XPHB}",
      "{@spell Weird|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Beguiling Spells (2/Day)

###### Description

The archmage casts Hypnotic Pattern or Mirror Image, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "2": [
      "{@spell Hypnotic Pattern|XPHB}",
      "{@spell Mirror Image|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 138,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 220,
    "formula": "40d8 + 40"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "deception": "+8",
    "perception": "+7",
    "stealth": "+8"
  },
  "passive": 17,
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "rod|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "Y"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "conditionInflictSpell": [
    "charmed",
    "frightened",
    "incapacitated",
    "invisible"
  ],
  "savingThrowForcedSpell": [
    "charisma",
    "constitution",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Necromancer Archmage

> Source: AU, p. 139

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

##### Marshal Undead

Undead creatures of the archmage's choice in a 60-foot Emanation originating from the archmage have Advantage on attack rolls and saving throws unless the archmage has the Incapacitated condition.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks. It can replace one attack with a use of Spellcasting to cast Blight.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:21 (3d10 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Blight|XPHB}",
    "{@spell Detect Magic|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}",
    "{@spell Speak with Dead|XPHB}"
  ],
  "daily": {
    "1e": [
      "{@spell Circle of Death|XPHB} (level 7 version)",
      "{@spell Create Undead|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 139,
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 225,
    "formula": "41d8 + 41"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "intimidation": "+8",
    "perception": "+7"
  },
  "passive": 17,
  "resist": [
    "necrotic"
  ],
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "crystal|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "N"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "savingThrowForcedSpell": [
    "constitution"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Transmuter Archmage

> Source: AU, p. 139

#### Traits

##### Magic Resistance

The archmage has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The archmage makes four Arcane Burst attacks.

##### Arcane Burst

m,r +10, reach 5 ft. or range 150 ft. Hit:27 (4d10 + 5) Force damage.

#### Spellcasting

##### Spellcasting

###### Description

The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 18):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Alter Self|XPHB}",
    "{@spell Detect Magic|XPHB}",
    "{@spell Knock|XPHB}",
    "{@spell Mage Armor|XPHB} (included in AC)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Polymorph|XPHB}",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "1": [
      "{@spell Reverse Gravity|XPHB}"
    ],
    "2": [
      "{@spell Gaseous Form|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Slow (2/Day)

###### Description

The archmage casts Slow, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "2": [
      "{@spell Slow|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Protective Magic (3/Day)

###### Description

The archmage casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "3": [
      "{@spell Counterspell|XPHB}",
      "{@spell Shield|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "daily"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 139,
  "referenceSources": [
    "AUD"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    16
  ],
  "hp": {
    "average": 220,
    "formula": "40d8 + 40"
  },
  "speed": {
    "walk": 40,
    "fly": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 10,
  "dex": 16,
  "con": 12,
  "int": 20,
  "wis": 15,
  "cha": 16,
  "skill": {
    "arcana": "+15",
    "history": "+10",
    "perception": "+7"
  },
  "passive": 17,
  "languages": [
    "Common plus five other languages"
  ],
  "cr": "15",
  "gear": [
    "staff|xphb"
  ],
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana",
    "individual"
  ],
  "traitTags": [
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "O"
  ],
  "damageTagsSpell": [
    "B",
    "P",
    "S"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "30f",
  "page": 135
}
```

</details>

## Baelnorn

*Undead Protector of Ancient Sites*

- #### Habitat:
  
  Forest, Urban
- #### Treasure:
  
  Arcana

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Baelnorn

> Source: AU

*Undead Protector of Ancient Sites*

Baelnorns are deathless guardians of treasures and lore. Each baelnorn was once a living person who undertook a non-evil process to preserve their existence that involved either a divine blessing or an ancient ritual. Many baelnorns were once elves. In fact, ancient elves were the first to discover the secret to becoming a baelnorn.

Baelnorns typically dedicate themselves to protecting vaults, castles, or ruins. In the Forgotten Realms, elf baelnorns protect the site of Myth Drannor, a ruined ancient city that was once a magical metropolis. Many enjoy studying ancient lore lost to living scholars. As only the most dedicated can endure the transition into a baelnorn, baelnorns are often proud of the eternal life they've achieved.

Unlike liches, baelnorns almost never have soul jars, although some baelnorns associated with a holy site might house their souls within a sacred relic. Many baelnorns create magical clones their spirits can inhabit if their bodies are destroyed.

Newly risen baelnorns look much as they did in life, albeit with glowing white eyes. They often continue their prior roles as guardians, sages, or teachers. A baelnorn's hair and flesh gradually fade away over many years; the oldest resemble stately skeletons in diaphanous raiment.

Baelnorns spend years poring over arcane tomes to aid their transition into undeath, and even those who weren't mages at the time of their transformation typically spend much of their long existences studying magical lore. As a result, baelnorns can cast powerful spells.

#### Baelnorn Lairs

Most baelnorns guard sites of historical or spiritual importance, sometimes long past the time anyone living remembers the sites. A few baelnorns instead guard great secrets, artifacts, or significant family lines, usually within such ancient sites. A baelnorn's protected site might be a grove of supernatural trees, the ruined capitol of a long-lost nation, or a library holding eons-old magical lore.

A baelnorn extends its presence into the region it inhabits, creating the following effects:

- ###### Projection
  
  While in its lair, the baelnorn can cast Project Image, requiring no spell components and using Intelligence as the spellcasting ability (spell save DC 19). The spell's range is limited to the baelnorn's lair.
- ###### Travel Ward
  
  Creatures can't use teleportation or planar travel to enter or exit the lair.

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

If the baelnorn is destroyed or moves its lair elsewhere, these effects end immediately.

Most baelnorns embody the ideal of scholarly focus and self-sacrifice for the benefit of society. If you meet one, I suspect they'd appreciate sharing a lively conversation or ten. Forever can be a lonely existence.

— Alustriel

[bestiary/AU/Baelnorn.webp](https://5e.tools/img/bestiary/AU/Baelnorn.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Baelnorn

> Source: AU, p. 141

#### Traits

##### Legendary Resistance (3/Day, or 4/Day in Lair)

If the baelnorn fails a saving throw, it can choose to succeed instead.

##### Magic Resistance

The baelnorn has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The baelnorn makes three attacks, using Arcane Burst or Paralyzing Touch in any combination. It can replace two attacks with a use of Spellcasting to cast Lightning Bolt (level 4 version).

##### Arcane Burst

m,r +11, reach 5 ft. or range 120 ft. Hit:31 (4d12 + 5) Force damage.

##### Paralyzing Touch

m +11, reach 5 ft. Hit:10 (2d4 + 5) Cold damage, and the target has the Paralyzed condition until the start of the baelnorn's next turn.

#### Legendary Actions

##### Overwhelming Radiance

con DC 19, each creature in a 20-foot Emanation originating from the baelnorn; Undead have Disadvantage on this save. Failure: 11 (2d10) Radiant damage. Success: Half damage.

##### Recuperative Teleport

The baelnorn teleports up to 60 feet to an unoccupied space it can see and regains 11 (2d10) Hit Points. The baelnorn can't take this action again until the start of its next turn.

#### Spellcasting

##### Spellcasting

###### Description

The baelnorn casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 19):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Detect Thoughts|XPHB}",
    "{@spell Dispel Magic|XPHB}",
    "{@spell Invisibility|XPHB}",
    "{@spell Lightning Bolt|XPHB} (level 4 version)",
    "{@spell Mage Hand|XPHB}",
    "{@spell Prestidigitation|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Dimension Door|XPHB}",
      "{@spell Scrying|XPHB}"
    ],
    "1e": [
      "{@spell Clone|XPHB}",
      "{@spell Guards and Wards|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Counterspell

###### Description

The baelnorn casts Counterspell in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Counterspell|XPHB}"
  ],
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "will"
  ]
}
```

</details>

##### Frightening Glance

###### Legendary Actions

<details><summary>Structured source fields</summary>

```json
{
  "1": [
    "{@spell Fear|XPHB}"
  ]
}
```

</details>

###### Description

The baelnorn casts Fear, using the same spellcasting ability as Spellcasting. The baelnorn can't take this action again until the start of its next turn.

<details><summary>Structured source fields</summary>

```json
{
  "ability": "int",
  "displayAs": "legendary",
  "hidden": [
    "legendary"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 141,
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "G"
  ],
  "ac": [
    18
  ],
  "hp": {
    "average": 255,
    "formula": "34d8 + 102"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 2
  },
  "str": 11,
  "dex": 16,
  "con": 16,
  "int": 21,
  "wis": 14,
  "cha": 16,
  "skill": {
    "arcana": "+17",
    "history": "+11",
    "insight": "+8",
    "perception": "+8"
  },
  "passive": 18,
  "resist": [
    "lightning",
    "radiant"
  ],
  "immune": [
    "necrotic",
    "poison"
  ],
  "conditionImmune": [
    "charmed",
    "frightened",
    "paralyzed",
    "poisoned"
  ],
  "languages": [
    "all"
  ],
  "cr": {
    "cr": "18",
    "xpLair": 22000
  },
  "legendaryActionsLair": 4,
  "environment": [
    "forest",
    "urban"
  ],
  "treasure": [
    "arcana"
  ],
  "traitTags": [
    "Legendary Resistances",
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "XX"
  ],
  "damageTags": [
    "C",
    "O",
    "R"
  ],
  "damageTagsSpell": [
    "L",
    "O"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "conditionInflict": [
    "paralyzed"
  ],
  "conditionInflictSpell": [
    "frightened",
    "invisible"
  ],
  "savingThrowForced": [
    "constitution"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "319",
  "page": 140
}
```

</details>

## Darkenbeast

*Flying, Mutated Minion of Wickedness*

- #### Habitat:
  
  Grassland, Hill, Urban
- #### Treasure:
  
  None

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Darkenbeast

> Source: AU

*Flying, Mutated Minion of Wickedness*

Darkenbeasts are ferocious, bestial hunters created from ordinary animals by sinister spellcasters. Regardless of darkenbeasts' original forms, the magic used to create them twists them into fanged horrors with leathery wings. Most darkenbeasts have luminous bones that glow through their skin; they resemble eerie flying skeletons as they soar through the night sky. A darkenbeast is loyal to its creators, who can extract the magic used to transform it in a dramatic display that's fatal to the darkenbeast.

Darkenbeasts might have vestigial characteristics of the animals they were before transformation. Roll on or choose a result from the Darkenbeast Origin table as inspiration for these cosmetic features.

#### Darkenbeast Origin

| 1d6 | The Darkenbeast Was Once A... |
| --- | --- |
| 1 | Cobra, so it has a flared neck and scaly skin. |
| 2 | Fox, giving it reddish fur and vulpine features. |
| 3 | Panther, so it has sharp claws and a high-pitched scream. |
| 4 | Rabbit, giving it long ears and a skittish demeanor. |
| 5 | Turtle, giving it a blunt snout and shell-like carapace. |
| 6 | Wolf, so it emits eerie howls. |



[bestiary/AU/Darkenbeast.webp](https://5e.tools/img/bestiary/AU/Darkenbeast.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Darkenbeast

> Source: AU, p. 142

#### Traits

##### Spell Imprint

As part of the darkenbeast's creation, its creator can cast one spell of level 5 or lower with a casting time of an action. The spell has no effect but is stored within the darkenbeast. While within 30 feet of the darkenbeast, the darkenbeast's creator can cast the stored spell, requiring no spell components and using the caster's spellcasting ability. When the spell is cast this way, its effects originate from the darkenbeast (as if the darkenbeast were the spellcaster), and immediately after the spell is cast, the darkenbeast dies in a flash of purple flame.

##### Sunlight Sensitivity

While in sunlight, the darkenbeast has Disadvantage on ability checks and attack rolls.

#### Actions

##### Multiattack

The darkenbeast makes three Rend attacks.

##### Rend

m +5, reach 5 ft. Hit:12 (2d8 + 3) Slashing damage.

#### Bonus Actions

##### Shadow Stalker

While in Dim Light or Darkness, the darkenbeast takes the Disengage or Hide action.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 142,
  "referenceSources": [
    "RWG"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "E"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 60,
    "formula": "8d8 + 24"
  },
  "speed": {
    "walk": 20,
    "fly": 40
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 17,
  "dex": 14,
  "con": 16,
  "int": 5,
  "wis": 10,
  "cha": 13,
  "skill": {
    "perception": "+2",
    "stealth": "+4"
  },
  "passive": 12,
  "conditionImmune": [
    "frightened"
  ],
  "cr": "4",
  "environment": [
    "grassland",
    "hill",
    "urban"
  ],
  "traitTags": [
    "Sunlight Sensitivity"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "damageTags": [
    "S"
  ],
  "miscTags": [
    "MA"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "31c",
  "page": 142
}
```

</details>

## Groundlings

*Skulking Hybrid Servitors*

- #### Habitat:
  
  Hill, Urban
- #### Treasure:
  
  Armaments

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Groundlings

> Source: AU

*Skulking Hybrid Servitors*

Groundlings are hairy, stinky bullies and insatiable carnivores. They use their claws not only to disembowel their victims but also to dig traps, tunnel beneath buildings, and excavate hiding spots from which to ambush prey.

Groundlings are created, not born. Most are magical mutations of fierce burrowing animals. Groundlings often serve as shock troops or assassins for their creators, though leaderless groundlings sometimes pursue lives as killers or mercenaries.

Groundlings are victims of heinous magic. The brutality of evil never ends, and thus we must continue to fight against it.

— Alustriel

[From Left to Right: Groundling Slayer, Groundling Grunt, Groundling Stalker](https://5e.tools/img/bestiary/AU/Groundlings.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Groundling Grunt

> Source: AU, p. 143

#### Actions

##### Claw

m +5, reach 5 ft. Hit:7 (1d8 + 3) Slashing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from one of two paws.

##### Sling

r +4, range 30/120 ft. Hit:7 (2d4 + 2) Bludgeoning damage.

#### Reactions

##### Go to Ground

Trigger: The groundling is hit by an attack roll while it is on the ground. Response: The groundling halves the damage (round down) it takes from that attack.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 143,
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "E"
  ],
  "ac": [
    14
  ],
  "hp": {
    "average": 45,
    "formula": "7d8 + 14"
  },
  "speed": {
    "walk": 30,
    "burrow": 10
  },
  "str": 16,
  "dex": 15,
  "con": 14,
  "int": 7,
  "wis": 10,
  "cha": 8,
  "skill": {
    "perception": "+2",
    "stealth": "+4",
    "survival": "+2"
  },
  "passive": 12,
  "resist": [
    "poison"
  ],
  "languages": [
    "Common"
  ],
  "cr": "1",
  "gear": [
    "sling|xphb"
  ],
  "environment": [
    "hill",
    "urban"
  ],
  "treasure": [
    "armaments"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "B",
    "S"
  ],
  "miscTags": [
    "MA",
    "RA",
    "RNG"
  ],
  "conditionInflict": [
    "grappled"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Groundling Stalker

> Source: AU, p. 144

#### Actions

##### Claw

m +5, reach 5 ft. Hit:12 (2d8 + 3) Slashing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from one of two paws.

##### Heavy Crossbow

r +5, range 100/400 ft. Hit:14 (2d10 + 3) Piercing damage.

#### Reactions

##### Go to Ground

Trigger: The groundling is hit by an attack roll while it is on the ground. Response: The groundling halves the damage (round down) it takes from that attack.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 144,
  "referenceSources": [
    "RWG"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "E"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 52,
    "formula": "8d8 + 16"
  },
  "speed": {
    "walk": 30,
    "burrow": 10
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 16,
  "dex": 16,
  "con": 14,
  "int": 8,
  "wis": 12,
  "cha": 8,
  "skill": {
    "perception": "+3",
    "stealth": "+5",
    "survival": "+3"
  },
  "passive": 13,
  "resist": [
    "poison"
  ],
  "languages": [
    "Common"
  ],
  "cr": "2",
  "gear": [
    "heavy crossbow|xphb"
  ],
  "environment": [
    "hill",
    "urban"
  ],
  "treasure": [
    "armaments"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "P",
    "S"
  ],
  "miscTags": [
    "MA",
    "RA",
    "RNG"
  ],
  "conditionInflict": [
    "grappled"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Groundling Slayer

> Source: AU, p. 144

#### Actions

##### Multiattack

The groundling makes two attacks, using Claw or Dagger in any combination.

##### Claw

m +5, reach 5 ft. Hit:12 (2d8 + 3) Slashing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from one of two paws.

##### Dagger

m,r +5, reach 5 ft. or range 20/60 ft. Hit:5 (1d4 + 3) Piercing damage plus 7 (2d6) Poison damage.

#### Reactions

##### Go to Ground

Trigger: The groundling is hit by an attack roll while it is on the ground. Response: The groundling halves the damage (round down) it takes from that attack.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 144,
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "E"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 58,
    "formula": "9d8 + 18"
  },
  "speed": {
    "walk": 30,
    "burrow": 20
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 17,
  "dex": 16,
  "con": 15,
  "int": 10,
  "wis": 13,
  "cha": 8,
  "skill": {
    "perception": "+3",
    "stealth": "+7",
    "survival": "+3"
  },
  "passive": 13,
  "resist": [
    "poison"
  ],
  "languages": [
    "Common"
  ],
  "cr": "3",
  "gear": [
    {
      "item": "dagger|xphb",
      "quantity": 6
    }
  ],
  "environment": [
    "hill",
    "urban"
  ],
  "treasure": [
    "armaments"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "I",
    "P",
    "S"
  ],
  "miscTags": [
    "MA",
    "MLW",
    "RA",
    "THW"
  ],
  "conditionInflict": [
    "grappled"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "31d",
  "page": 143
}
```

</details>

## Living Spells

*Animate Magical Effects*

- #### Habitat:
  
  Any
- #### Treasure:
  
  None

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Living Spells

> Source: AU

*Animate Magical Effects*

Magical energies unleashed during cataclysmic battles or catastrophic experiments can cause spell effects to come to life as living spells. These beings' magical energy is persistent, and they bear features resembling those of their origin spells—usually Conjuration or Evocation spells. Living spells typically linger in the region of their creation, subsisting on ambient magical energy and lashing out at creatures they encounter.

#### Creating Living Spells

Living spells come in many varieties; the stat blocks here are three examples. To make a living spell from a different spell, choose a damage-dealing Conjuration or Evocation spell of level 1–5 from the Wizard spell list. Then consult the Living Spell Customization table to see which stat block to customize based on the chosen spell's level.

##### Living Spell Customization

| Spell Level | Stat Block to Customize |
| --- | --- |
| 1–2 | Living Thunderwave |
| 3–4 | Living Vitriolic Sphere |
| 5 | Living Cone of Cold |



Now make the following changes to the stat block:

- ###### Damage Immunity
  
  Replace the living spell's damage Immunity with Immunity to the type (or types) of damage dealt by the chosen spell.
- ###### Magical Strike
  
  Change the damage type dealt by Magical Strike to one of the damage types dealt by the chosen spell.
- ###### Spell Mimicry
  
  Replace the effect of Spell Mimicry with the effect of the chosen spell. If that spell requires a saving throw, use the spell save DC from Spell Mimicry. If the spell involves an attack roll, use the attack bonus from the living spell's Magical Strike.

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

For example, if you turn Fireball (a level 3 spell) into a living spell, customize the Living Vitriolic Sphere stat block. The living fireball has Immunity to Fire damage instead of Acid damage, deals Fire damage with its Magical Strike, and replicates *Fireball* with Spell Mimicry.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Living Cone of Cold

> Source: AU, p. 146

#### Traits

##### Amorphous

The living spell can move through a space as narrow as 1 inch without expending extra movement to do so.

##### Magic Resistance

The living spell has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The living spell makes two Magical Strike attacks.

##### Magical Strike

m +8, reach 10 ft. Hit:27 (5d8 + 5) Cold damage.

##### Spell Mimicry 5

con DC 16, each creature in a 60-foot Cone. Failure: 36 (8d8) Cold damage. Success: Half damage.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 146,
  "size": [
    "L"
  ],
  "alignment": [
    "U"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 105,
    "formula": "10d10 + 50"
  },
  "speed": {
    "walk": 25,
    "fly": 25
  },
  "str": 10,
  "dex": 15,
  "con": 20,
  "int": 3,
  "wis": 11,
  "cha": 6,
  "passive": 10,
  "immune": [
    "cold"
  ],
  "conditionImmune": [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "poisoned",
    "prone",
    "restrained"
  ],
  "cr": "7",
  "environment": [
    "any"
  ],
  "tokenCredit": "scorpion0rk",
  "tokenCustom": true,
  "traitTags": [
    "Amorphous",
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "damageTags": [
    "C"
  ],
  "miscTags": [
    "MA",
    "RCH"
  ],
  "savingThrowForced": [
    "constitution"
  ],
  "hasToken": true,
  "hasFluff": true
}
```

</details>



### Living Thunderwave

> Source: AU, p. 146

#### Traits

##### Amorphous

The living spell can move through a space as narrow as 1 inch without expending extra movement to do so.

##### Magic Resistance

The living spell has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Magical Strike

m +5, reach 5 ft. Hit:6 (1d6 + 3) Thunder damage.

##### Spell Mimicry 5

con DC 13, each creature in a 15-foot Cube originating from the living spell. Failure: 9 (2d8) Thunder damage, and the target is pushed 10 feet away from the living spell. Success: Half damage only. Success or Failure: A thunderous boom is audible within 300 feet.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 146,
  "referenceSources": [
    "RWG"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "U"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 30,
    "formula": "4d8 + 12"
  },
  "speed": {
    "walk": 25,
    "fly": 25
  },
  "str": 10,
  "dex": 13,
  "con": 16,
  "int": 3,
  "wis": 6,
  "cha": 6,
  "passive": 8,
  "immune": [
    "thunder"
  ],
  "conditionImmune": [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "poisoned",
    "prone",
    "restrained"
  ],
  "cr": "1",
  "environment": [
    "any"
  ],
  "traitTags": [
    "Amorphous",
    "Magic Resistance"
  ],
  "damageTags": [
    "T"
  ],
  "miscTags": [
    "MA"
  ],
  "savingThrowForced": [
    "constitution"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Living Vitriolic Sphere

> Source: AU, p. 146

#### Traits

##### Amorphous

The living spell can move through a space as narrow as 1 inch without expending extra movement to do so.

##### Magic Resistance

The living spell has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The living spell makes two Magical Strike attacks.

##### Magical Strike

m +7, reach 10 ft. Hit:21 (5d6 + 4) Acid damage.

##### Spell Mimicry 5

dex DC 15, each creature in a 20-foot-radius Sphere centered on a point within 150 feet. Failure: 25 (10d4) Acid damage, and 12 (5d4) Acid damage at the end of the target's next turn. Success: Half initial damage only.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 146,
  "referenceSources": [
    "RWG"
  ],
  "size": [
    "L"
  ],
  "alignment": [
    "U"
  ],
  "ac": [
    15
  ],
  "hp": {
    "average": 76,
    "formula": "8d10 + 32"
  },
  "speed": {
    "walk": 25,
    "fly": 25
  },
  "str": 10,
  "dex": 15,
  "con": 18,
  "int": 3,
  "wis": 10,
  "cha": 6,
  "passive": 10,
  "immune": [
    "acid"
  ],
  "conditionImmune": [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "poisoned",
    "prone",
    "restrained"
  ],
  "cr": "5",
  "environment": [
    "any"
  ],
  "tokenCredit": "Joe Hustak",
  "tokenCustom": true,
  "traitTags": [
    "Amorphous",
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "damageTags": [
    "A"
  ],
  "miscTags": [
    "AOE",
    "MA",
    "RCH"
  ],
  "savingThrowForced": [
    "dexterity"
  ],
  "hasToken": true,
  "hasFluff": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "322",
  "page": 145
}
```

</details>

## Spellguard

*Magic-Hardened Bodyguard*

- #### Habitat:
  
  Urban
- #### Treasure:
  
  Armaments

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Spellguard

> Source: AU

*Magic-Hardened Bodyguard*

Spellguards are professional bodyguards who specialize in repelling magical aggression. Spellguards supplement their imposing armor with magical defenses to protect themselves and their charges. They most often work for spellcasters distrustful of rivals, but a spellguard might guard anyone who fears magical foes. The Spellguard Shield is named after this tradition, as that item's power replicates a spellguard's protections.

Silverymoon's spellguards have my undying loyalty and gratitude. I trust them with my life.

— Alustriel

[bestiary/AU/Spellguard.webp](https://5e.tools/img/bestiary/AU/Spellguard.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Spellguard

> Source: AU, p. 147

#### Traits

##### Superior Magic Resistance

The spellguard has Advantage on saving throws against spells and other magical effects. Spell attack rolls have Disadvantage against the spellguard.

#### Actions

##### Multiattack

The spellguard makes two attacks, using Force Flail or Javelin in any combination.

##### Force Flail

m +7, reach 5 ft. Hit:8 (1d8 + 4) Bludgeoning damage plus 7 (2d6) Force damage.

##### Javelin

m,r +7, reach 5 ft. or range 30/120 ft. Hit:14 (3d6 + 4) Piercing damage.

#### Reactions

##### Defensive Divination

Trigger: A creature the spellguard can see hits an ally within 5 feet of the spellguard with an attack roll, or an ally within 5 feet of the spellguard fails a saving throw against a spell or other magical effect. Response: The spellguard rolls 1d20 and chooses whether to use that roll in place of the d20 rolled for the attack roll or saving throw.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 147,
  "referenceSources": [
    "RWG"
  ],
  "size": [
    "M"
  ],
  "alignment": [
    "L",
    "N"
  ],
  "ac": [
    20
  ],
  "hp": {
    "average": 105,
    "formula": "14d8 + 42"
  },
  "speed": {
    "walk": 30
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 18,
  "dex": 11,
  "con": 16,
  "int": 12,
  "wis": 13,
  "cha": 10,
  "skill": {
    "arcana": "+4",
    "athletics": "+7",
    "perception": "+4"
  },
  "passive": 14,
  "languages": [
    "Common"
  ],
  "cr": "5",
  "gear": [
    "flail|xphb",
    {
      "item": "javelin|xphb",
      "quantity": 6
    },
    "plate armor|xphb",
    "shield|xphb"
  ],
  "environment": [
    "urban"
  ],
  "treasure": [
    "armaments"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "C"
  ],
  "damageTags": [
    "B",
    "O",
    "P"
  ],
  "miscTags": [
    "MA",
    "MLW",
    "RA",
    "THW"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "327",
  "page": 147
}
```

</details>

## Taisus

*Magically Ascended Mage*

- #### Habitat:
  
  Any
- #### Treasure:
  
  Arcana

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

### Taisus

> Source: AU

*Magically Ascended Mage*

The most gifted mortal mages can sometimes peer beyond reality to glimpse pure, untrammeled magic. Directly accessing this energy requires years of careful study and dangerous rituals. Any mage who succeeds taps into esoteric powers that strip away the mage's physical body, blending their mortal mind with raw magic to form a quasi-corporeal entity called a taisus, or an ascended mage.

A taisus initially retains the personality and values of the mortal mage it was before, but its mindset eventually becomes alien, taking on a long-term outlook that seems callous to mortals. Most taisuses seek to draw energies from places of significant magical power, such as planar portals or quintessence pools, in order to create bizarre magic items, reshape the nature of magic, or lead others to duplicate their eldritch ascension. A taisus's end goal is unfathomable to mortal minds.

[bestiary/AU/Taisus.webp](https://5e.tools/img/bestiary/AU/Taisus.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Taisus

> Source: AU, p. 148

#### Traits

##### Arcane Immortality

If the taisus dies, its body crumbles into glittering dust. It gains a new body after 1d10 days, reviving with all its Hit Points, unless a Wish spell is cast on its remains to prevent the effects of this trait. The new body appears in an unoccupied space within 5 feet of a location designated by the taisus on its creation.

##### Legendary Resistance (4/Day)

If the taisus fails a saving throw, it can choose to succeed instead.

##### Magic Resistance

The taisus has Advantage on saving throws against spells and other magical effects.

#### Actions

##### Multiattack

The taisus makes two Brain Drain attacks.

##### Brain Drain

m +13, reach 20 ft. Hit:20 (3d8 + 7) Force damage plus 16 (3d10) Psychic damage, and if the target is a creature with spell slots, it's subjected to the following effect. con DC 21. Failure: The target's highest-level unexpended spell slot is expended.

#### Legendary Actions

##### Deadly Drain

The taisus makes a Brain Drain attack. The taisus can't take this action again until the start of its next turn.

##### Teleport

The taisus teleports itself or a willing creature it can see within 10 feet of itself up to 120 feet to an unoccupied space the taisus can see.

#### Spellcasting

##### Spellcasting

###### Description

The taisus casts one of the following spells, requiring no Material components and using Intelligence as the spellcasting ability (spell save DC 21):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Fireball|XPHB} (level 5 version)",
    "{@spell Invisibility|XPHB}",
    "{@spell Mage Hand|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Jallarzi's Storm of Radiance|XPHB}",
      "{@spell Plane Shift|XPHB}",
      "{@spell Scrying|XPHB}"
    ],
    "1e": [
      "{@spell Befuddlement|XPHB}",
      "{@spell Disintegrate|XPHB}"
    ]
  },
  "ability": "int",
  "displayAs": "action"
}
```

</details>

##### Protective Magic

###### Description

The taisus casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Counterspell|XPHB}",
    "{@spell Shield|XPHB}"
  ],
  "ability": "int",
  "displayAs": "reaction",
  "hidden": [
    "will"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 148,
  "size": [
    "H"
  ],
  "alignment": [
    "C",
    "N"
  ],
  "ac": [
    18
  ],
  "hp": {
    "average": 310,
    "formula": "27d12 + 135"
  },
  "speed": {
    "walk": 40,
    "fly": 60
  },
  "initiative": {
    "proficiency": 1
  },
  "str": 17,
  "dex": 18,
  "con": 20,
  "int": 25,
  "wis": 22,
  "cha": 19,
  "skill": {
    "arcana": "+19",
    "insight": "+12",
    "perception": "+12"
  },
  "passive": 22,
  "immune": [
    "poison"
  ],
  "conditionImmune": [
    "charmed",
    "frightened",
    "grappled",
    "paralyzed",
    "petrified",
    "poisoned",
    "restrained"
  ],
  "languages": [
    "all; telepathy 120 ft."
  ],
  "cr": "19",
  "environment": [
    "any"
  ],
  "treasure": [
    "arcana"
  ],
  "traitTags": [
    "Legendary Resistances",
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "TP",
    "XX"
  ],
  "damageTags": [
    "O",
    "Y"
  ],
  "damageTagsSpell": [
    "F",
    "O",
    "R",
    "T",
    "Y"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RCH"
  ],
  "conditionInflictSpell": [
    "blinded",
    "deafened",
    "invisible"
  ],
  "savingThrowForced": [
    "constitution"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "dexterity",
    "intelligence",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "329",
  "page": 148
}
```

</details>

## Venger

*Corrupted Force of Evil*

### Venger

> Source: AU

*Corrupted Force of Evil*

An immortal mage and Fiend with an implacable hatred for 8, Venger seeks to rule nations by amassing sycophants and long-lost magical artifacts. Though his bat-like wings allow him to fly, Venger prefers to ride on his trusted flying steed, a Nightmare that lurks on the Ethereal Plane until it's needed. Venger sends his adviser, Shadow Demon, to survey distant lands, then weaves interlocking plans based on Shadow Demon's reports.

Venger was once a good-hearted human studying wizardry under the cryptic tutelage of his father. In time, Venger grew impatient and sought to increase his magical prowess by dabbling in minor pacts with demons. He eventually met demons who worshipped 8 the Chained God, an entity the demons believed powerful enough to create whole planes of existence. Venger yearned to forge a pact with this entity, believing that doing so would give him immense power.

With the help of these Tharizdun-worshipping demons, Venger opened a brief window into the demiplane of Tharizdun's imprisonment. The demons had neglected to mention that the souls of all who look on the Chained God face certain doom. As Venger gazed on this entity—an unknowable, indescribable blend of demonic and aberrant influence—Venger's form warped, and the last traces of goodness sloughed off him. The demons collected this good essence and locked it in a vault that they spirited away to a distant corner of the Material Plane. Venger emerged from this encounter as a cruel, twisted version of himself, exalted now with immortality and magical might, and he vowed to free the Chained God.

At first, Venger earnestly pursued this promise. In time, though, he grew to despise his vow and neglected it in favor of his own pursuit of power. Now he no longer wants Tharizdun freed, knowing his disloyalty could make him a target of Tharizdun's wrath.

After abandoning his quest to free Tharizdun, Venger sought to use several Orbs of Dragonkind to control Tiamat. This futile endeavor earned Venger Tiamat's lifelong enmity. Venger now plots endlessly to destroy or subjugate Tiamat, among other nefarious designs. Roll on or choose a result from the Venger's Schemes table to inspire Venger's next power play.

#### Venger's Schemes

| 1d6 | Venger Plots To... |
| --- | --- |
| 1 | Imprison those who would oppose him in a vast labyrinth of his own creation called the Maze of Darkness. |
| 2 | Summon a two-headed, Abyssal dragon called the Demodragon (use the Adult Black Dragon stat block) and unleash it on a nation. |
| 3 | Recruit heroes to help him thwart the League of Malevolence, a villainous group led by his former lackey, the mage Kelek. |
| 4 | Disguise himself as a wise wizard or noble paladin to trick innocents into giving him a powerful artifact. |
| 5 | Assemble six powerful magic items and use their magic at a site called the Hall of Bones to gain enough power to destroy Tiamat for good. |
| 6 | Find an artifact called the Box of Balefire and keep it away from other villains; Venger fears it could unleash Tharizdun. |



#### Venger's Lairs

Venger keeps several lairs in each of the worlds he visits. Each is a castle perched above or extending from the side of a treacherous cliff, but none are identical.

Venger's presence fouls the regions his lairs inhabit, creating the following effects:

- ###### Desolate Terrain
  
  Plant life within 1 mile of a lair withers and dies, creating a barren wasteland of cracked dirt.
- ###### Tormented Rest
  
  Abyssal whispers plague visitors' dreams. Whenever a creature other than Venger or his allies finishes a Long Rest within 1 mile of a lair, it must succeed on a DC 15 Constitution saving throw or gain 1 Exhaustion level.

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

If Venger dies or moves a lair elsewhere, these effects end immediately.

[bestiary/AU/Venger.webp](https://5e.tools/img/bestiary/AU/Venger.webp)

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU"
}
```

</details>



### Venger

> Source: AU, p. 150

#### Traits

##### Fiendish Restoration

If Venger dies, his body dissipates into crimson dust, and he gains a new body in 1d10 days, reviving with all his Hit Points somewhere in one of his lairs.

##### Legendary Resistance (3/Day, or 4/Day in Lair)

If Venger fails a saving throw, he can choose to succeed instead.

##### Magic Resistance

Venger has Advantage on saving throws against spells and magical effects.

##### Mounted Adept

While Venger is mounted, he and his mount have Advantage on Dexterity saving throws, and Venger can force an attack targeting his mount to target him instead. Venger can't use this trait if he has the Incapacitated condition.

#### Actions

##### Multiattack

Venger makes three attacks, using Crimson Claw or Crimson Blast in any combination.

##### Crimson Claw

m +11, reach 5 ft. Hit:14 (2d8 + 5) Slashing damage plus 10 (3d6) Fire damage.

##### Crimson Blast

r +11, range 120 ft. Hit:24 (3d12 + 5) Force damage.

#### Legendary Actions

##### Booming Censure

wis DC 19, one creature Venger can see within 60 feet. Failure: 14 (4d6) Psychic damage, and the target has the Frightened condition until the end of its next turn. Success: Half damage only.

##### Crimson Strike

Venger makes one Crimson Claw or Crimson Blast attack.

##### Magic-Binding Chains

dex DC 19, one creature Venger can see within 30 feet. Failure: The target has the Restrained condition until the end of its next turn. While Restrained, the target can't take the Magic action. Success or Failure: Venger can't take this action again until the start of his next turn.

#### Spellcasting

##### Spellcasting

###### Description

Venger casts one of the following spells, using Charisma as the spellcasting ability (spell save DC 19):

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Detect Magic|XPHB}",
    "{@spell Invisibility|XPHB}",
    "{@spell Mage Hand|XPHB}",
    "{@spell Silent Image|XPHB}"
  ],
  "daily": {
    "2e": [
      "{@spell Alter Self|XPHB}",
      "{@spell Contact Other Plane|XPHB}",
      "{@spell Create Undead|XPHB}",
      "{@spell Dimension Door|XPHB}"
    ],
    "1e": [
      "{@spell Control Weather|XPHB}",
      "{@spell Imprisonment|XPHB}"
    ]
  },
  "ability": "cha",
  "displayAs": "action"
}
```

</details>

##### Telekinesis (2/Day)

###### Description

Venger casts Telekinesis, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "daily": {
    "2": [
      "{@spell Telekinesis|XPHB}"
    ]
  },
  "ability": "cha",
  "displayAs": "bonus",
  "hidden": [
    "daily"
  ]
}
```

</details>

##### Protective Magic

###### Description

Venger casts Counterspell or Shield in response to the spell's trigger, using the same spellcasting ability as Spellcasting.

<details><summary>Structured source fields</summary>

```json
{
  "will": [
    "{@spell Counterspell|XPHB}",
    "{@spell Shield|XPHB}"
  ],
  "ability": "cha",
  "displayAs": "reaction",
  "hidden": [
    "will"
  ]
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "isNamedCreature": true,
  "source": "AU",
  "page": 150,
  "size": [
    "M"
  ],
  "alignment": [
    "N",
    "E"
  ],
  "ac": [
    19
  ],
  "hp": {
    "average": 202,
    "formula": "27d8 + 81"
  },
  "speed": {
    "walk": 30,
    "fly": 30
  },
  "initiative": {
    "proficiency": 2
  },
  "str": 18,
  "dex": 20,
  "con": 16,
  "int": 17,
  "wis": 14,
  "cha": 21,
  "skill": {
    "arcana": "+9",
    "deception": "+11",
    "intimidation": "+11",
    "perception": "+8"
  },
  "passive": 18,
  "resist": [
    "cold",
    "fire",
    "lightning",
    "poison"
  ],
  "conditionImmune": [
    "poisoned"
  ],
  "languages": [
    "Abyssal",
    "Common",
    "Infernal"
  ],
  "cr": {
    "cr": "17",
    "xpLair": 20000
  },
  "legendaryActionsLair": 4,
  "traitTags": [
    "Legendary Resistances",
    "Magic Resistance"
  ],
  "actionTags": [
    "Multiattack"
  ],
  "languageTags": [
    "AB",
    "C",
    "I"
  ],
  "damageTags": [
    "F",
    "O",
    "S",
    "Y"
  ],
  "damageTagsSpell": [
    "B",
    "O",
    "P",
    "S",
    "Y"
  ],
  "spellcastingTags": [
    "O"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "conditionInflict": [
    "frightened",
    "restrained"
  ],
  "conditionInflictSpell": [
    "invisible",
    "restrained",
    "unconscious"
  ],
  "savingThrowForced": [
    "dexterity",
    "wisdom"
  ],
  "savingThrowForcedSpell": [
    "constitution",
    "intelligence",
    "strength",
    "wisdom"
  ],
  "hasToken": true,
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "32a",
  "page": 149
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "30e",
  "page": 135
}
```

</details>
