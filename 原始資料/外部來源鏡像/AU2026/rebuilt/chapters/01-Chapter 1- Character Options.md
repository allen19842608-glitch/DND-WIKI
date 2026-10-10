# Chapter 1: Character Options

[When magic is involved, a hero's journey can take infinite paths.](https://5e.tools/img/book/AU/002-01-001.ch-1-splash.webp)

This chapter is full of new character options you can use to make characters suited to magical settings. The pages that follow include new and revised subclasses, new backgrounds, and new feats.

## Subclasses

This chapter presents eight new subclasses that are particularly appropriate for characters in settings that emphasize magic:

- Arcana Domain (Cleric): A Cleric of a divine force who understands the secrets and potential of magic intimately
- Arcane Archer (Fighter): A Fighter who draws on a unique tradition of elven archery to weave magic into their attacks
- Warrior of the Mystic Arts (Monk): A Monk who wields magic to supplement their martial skill
- Vestige Patron (Warlock): A Warlock who draws on the power of a dying god
- Conjurer (Wizard): A Wizard who has mastered the arts of teleportation and summoning spirit allies
- Enchanter (Wizard): A Wizard who has become an expert in clouding and captivating minds
- Necromancer (Wizard): A Wizard who can manipulate and draw magic from life, death, and undeath
- Transmuter (Wizard): A Wizard who has mastered modifying energy and matter

<details><summary>Structured source fields</summary>

```json
{
  "page": 7,
  "style": "list-no-bullets"
}
```

</details>

Mystra's gifts range from subtle to earthshakingly powerful. Infuse your day with a little magic or stop a mighty villain from causing suffering—or both. When you study magic, your options are unlimited.

— Alustriel

<details><summary>Structured source fields</summary>

```json
{
  "id": "008",
  "page": 7
}
```

</details>

### Arcana Domain

> Source: AU, p. 8

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Arcana",
  "source": "AU",
  "className": "Cleric",
  "classSource": "XPHB",
  "page": 8,
  "edition": "one",
  "additionalSpells": [
    {
      "known": {
        "3": [
          {
            "choose": "level=0|class=Wizard",
            "count": 2
          }
        ]
      },
      "prepared": {
        "3": [
          "detect magic|xphb",
          "magic missile|xphb",
          "magic weapon|xphb",
          "nystul's magic aura|xphb"
        ],
        "5": [
          "counterspell|xphb",
          "dispel magic|xphb"
        ],
        "7": [
          "arcane eye|xphb",
          "leomund's secret chest|xphb"
        ],
        "9": [
          "bigby's hand|xphb",
          "teleportation circle|xphb"
        ],
        "17": [
          {
            "choose": "level=6|class=Wizard"
          },
          {
            "choose": "level=7|class=Wizard"
          },
          {
            "choose": "level=8|class=Wizard"
          },
          {
            "choose": "level=9|class=Wizard"
          }
        ]
      },
      "ability": "wis"
    }
  ],
  "subclassFeatures": [
    "Arcana Domain|Cleric|XPHB|Arcana|AU|3|AU",
    "Dispelling Recovery|Cleric|XPHB|Arcana|AU|6|AU",
    "Magical Mastery|Cleric|XPHB|Arcana|AU|17|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Arcana Domain

> Source: AU, p. 8

*Amplify Your Magical Power*

Magic suffuses the multiverse and fuels both destruction and creation. Clerics with the Arcana Domain view magical knowledge not as power to be used in pursuit of personal ends, but as a gift they have the responsibility to share.

Gods associated with the Arcana Domain know the secrets and potential of magic intimately. These gods are often connected to knowledge, secrecy, or power.

#### Arcana Domain Spells

> Source: AU, p. 8

Your connection to this divine domain means you always have certain spells ready. When you reach a Cleric level specified in the Arcana Domain Spells table, you thereafter always have the listed spells prepared.

##### Arcana Domain Spells

| Cleric Level | Prepared Spells |
| --- | --- |
| 3 | Detect Magic, Magic Missile, Magic Weapon, Nystul's Magic Aura |
| 5 | Counterspell, Dispel Magic |
| 7 | Arcane Eye, Leomund's Secret Chest |
| 9 | Bigby's Hand, Teleportation Circle |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Modify Magic

> Source: AU, p. 8

You can use your Channel Divinity to alter your spells as you cast them. When you cast a spell, you can expend one use of your Channel Divinity and change the spell in one of the following ways (no action required).

#### Fortifying Spell

> Source: AU, p. 8

One target of the spell gains a number of Temporary Hit Points equal to 2d8 plus your Cleric level.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3,
  "header": 2,
  "consumes": {
    "name": "Channel Divinity",
    "amount": 1
  }
}
```

</details>

#### Tenacious Spell

> Source: AU, p. 8

When you cast a spell that forces a creature to make a saving throw, and a creature you can see succeeds on that saving throw, roll 1d6 and subtract the number rolled from the target's first saving throw against the spell's effect.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3,
  "header": 2,
  "consumes": {
    "name": "Channel Divinity",
    "amount": 1
  }
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Student of Arcana

> Source: AU, p. 8

You gain the following benefits.

##### Magical Knowledge

You gain proficiency in the Arcana skill or one skill of your choice from the skills available to Clerics at level 1.

<details><summary>Structured source fields</summary>

```json
{
  "page": 8
}
```

</details>

##### Cantrips

You learn two level=0 of your choice. Whenever you gain a Cleric level, you can replace one of these cantrips with another level=0.

<details><summary>Structured source fields</summary>

```json
{
  "page": 8
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 8,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Dispelling Recovery

> Source: AU, p. 9

Immediately after you cast a spell with a spell slot that restores Hit Points to a creature or ends a condition on a creature, you can cast Dispel Magic as part of that action, Bonus Action, or Reaction, and without expending a spell slot.

Once you use this feature, you can't use it again until you finish a Short or Long Rest. You also restore your use of it by expending one use of Channel Divinity (no action required).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Magical Mastery

> Source: AU, p. 9

You learn four level=6;7;8;9, one from each of levels 6, 7, 8, and 9. You thereafter always have those spells prepared. Whenever you gain a Cleric level, you can replace one of these spells with another level=6;7;8;9 of the same level.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Cleric",
  "classSource": "XPHB",
  "subclassShortName": "Arcana",
  "subclassSource": "AU",
  "level": 17,
  "header": 2
}
```

</details>

### Arcane Archer

> Source: AU, p. 9

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Arcane Archer",
  "source": "AU",
  "className": "Fighter",
  "classSource": "XPHB",
  "page": 9,
  "edition": "one",
  "spellcastingAbility": "int",
  "additionalSpells": [
    {
      "known": {
        "3": [
          "druidcraft|xphb#c"
        ]
      }
    },
    {
      "known": {
        "3": [
          "prestidigitation|xphb#c"
        ]
      }
    }
  ],
  "optionalfeatureProgression": [
    {
      "name": "Arcane Shots",
      "featureType": [
        "AS"
      ],
      "progression": {
        "3": 2,
        "7": 3,
        "10": 4,
        "15": 5,
        "18": 6
      }
    }
  ],
  "subclassFeatures": [
    "Arcane Archer|Fighter|XPHB|Arcane Archer|AU|3|AU",
    "Curving Shot|Fighter|XPHB|Arcane Archer|AU|7|AU",
    "Magical Ammunition|Fighter|XPHB|Arcane Archer|AU|7|AU",
    "Ever-Ready Shot|Fighter|XPHB|Arcane Archer|AU|10|AU",
    "Indomitable Teleport|Fighter|XPHB|Arcane Archer|AU|15|AU",
    "Masterful Shots|Fighter|XPHB|Arcane Archer|AU|18|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Arcane Archer

> Source: AU, p. 9

*Deploy Magical Effects Through Enchanted Ammunition*

An Arcane Archer studies a unique elven method of archery that weaves magic into attacks to produce supernatural effects. Over the centuries, other folk have learned this technique and broadened it so it applies to ranged weapons of many kinds and to aspects of adventuring life outside of combat.

#### Arcane Archer Lore

> Source: AU, p. 9

You learn magical theory and secrets of nature, granting you the following benefits.

##### Cantrip

You know either the Druidcraft or the Prestidigitation cantrip. Intelligence is your spellcasting ability for it.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### Skills

You gain proficiency in the Arcana and Nature skills. If you already have one of these proficiencies, you instead gain proficiency in a different skill of your choice from the skills available to Fighters at level 1 (or in two skills available to Fighters at level 1 if you have both).

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Arcane Shot

> Source: AU, p. 9

You learn to unleash special magical effects with your shots.

You learn two feature type=AS of your choice. You learn an additional Arcane Shot option of your choice when you reach Fighter levels 7, 10, 15, and 18. Each time you learn a new Arcane Shot option, you can also replace one option you know with a different one.

##### Using Arcane Shot

Once per turn when you make a ranged attack using a weapon with the Ammunition property, you can apply one of your Arcane Shot options to that attack. You decide to use the option when you hit a creature and deal damage to it unless the option doesn't involve an attack roll.

You can use this feature a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### Arcane Shot Die

Arcane Shot options refer to your Arcane Shot Die. Your Arcane Shot Die is a d6.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### Saving Throws

If an Arcane Shot option requires a saving throw, the DC equals 8 plus your Intelligence modifier and Proficiency Bonus.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### At Higher Levels

Your Arcane Shot Die changes when you reach certain Fighter levels. The die becomes a d8 at level 10, a d10 at level 15, and a d12 at level 18.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Arcane Shot Options

> Source: AU, p. 9

The Arcane Shot feature lets you choose options for it at certain levels. The options are presented here in alphabetical order.

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Banishing Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Beguiling Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Bursting Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Enfeebling Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Grasping Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Piercing Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Seeking Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "optionalfeature": "Shadow Shot|AU"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "count": 2
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Curving Shot

> Source: AU, p. 9

You learn how to direct an errant shot toward a new target. If you make a ranged attack roll with a weapon with the Ammunition property and miss, you can cause the shot to ricochet toward a new target as a Bonus Action immediately after the attack misses. The new target must be a creature you can see within the weapon's range and within 60 feet of the attack's original target. Make an attack roll against the new target.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 7,
  "header": 2
}
```

</details>

#### Magical Ammunition

> Source: AU, p. 9

You learn to imbue your ammunition with magical properties. As a Magic action, you can imbue a piece of nonmagical ammunition with one of the following magical properties and fire it at a solid surface you can see within the weapon's range. When the ammunition hits the surface, the ammunition's effect activates, and the ammunition attaches to the surface it hit for the duration of the effect; you can remove an attached piece of ammunition as a Magic action, ending the effect early. When the effect ends, the ammunition is destroyed.

Once you use this feature, you can't do so again until you finish a Short or Long Rest. You can also restore your use of this feature by expending a use of your Second Wind (no action required).

##### Darkening Ammunition

Magical shadows fill a 15-foot Emanation originating from the ammunition for 1 minute. Nonmagical flames in the Emanation are extinguished, and creatures in the Emanation have a −5 penalty to Wisdom (Perception) checks and Passive Perception.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### Unlocking Ammunition

A burst of magic fills a 15-foot Emanation originating from the ammunition. The ammunition also emits a loud knocking sound, audible up to 300 feet away. Any object in the Emanation that is held shut by a nonmagical lock or that is stuck or barred becomes unlocked, unstuck, or unbarred. If such an object has multiple locks, only one of them is unlocked.

<details><summary>Structured source fields</summary>

```json
{
  "page": 9
}
```

</details>

##### Vine Ammunition

A 120-foot-long vine grows from the ammunition. You and other creatures can then climb it. The vine withers away after 10 minutes.

<details><summary>Structured source fields</summary>

```json
{
  "page": 10
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 9,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 7,
  "header": 2
}
```

</details>

#### Ever-Ready Shot

> Source: AU, p. 10

When you roll Initiative, you can regain one expended use of Arcane Shot.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 10,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Indomitable Teleport

> Source: AU, p. 10

Your magical mastery lets you escape dire situations. When you use your Indomitable feature and succeed on the saving throw, you can teleport up to 60 feet to an unoccupied space you can see.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 10,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 15,
  "header": 2
}
```

</details>

#### Masterful Shots

> Source: AU, p. 10

You employ agility in your sharpshooting. When a creature you can see misses you with an attack roll, you can take a Reaction to move up to half your Speed away from the attacker without provoking Opportunity Attacks. You can then make a ranged attack roll against the attacker as part of this Reaction if the attacker is within the weapon's range.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 10,
  "className": "Fighter",
  "classSource": "XPHB",
  "subclassShortName": "Arcane Archer",
  "subclassSource": "AU",
  "level": 18,
  "header": 2
}
```

</details>

### Warrior of the Mystic Arts

> Source: AU, p. 11

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Mystic Arts",
  "source": "AU",
  "className": "Monk",
  "classSource": "XPHB",
  "page": 11,
  "edition": "one",
  "spellcastingAbility": "wis",
  "casterProgression": "1/3",
  "preparedSpellsProgression": [
    0,
    0,
    3,
    4,
    4,
    4,
    5,
    6,
    6,
    7,
    8,
    8,
    9,
    10,
    10,
    11,
    11,
    11,
    12,
    13
  ],
  "preparedSpellsChange": "level",
  "cantripProgression": [
    0,
    0,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3
  ],
  "additionalSpells": [
    {
      "expanded": {
        "3": [
          {
            "all": "level=0|class=Sorcerer"
          },
          {
            "all": "level=1|class=Sorcerer"
          }
        ],
        "7": [
          {
            "all": "level=2|class=Sorcerer"
          }
        ],
        "13": [
          {
            "all": "level=3|class=Sorcerer"
          }
        ],
        "19": [
          {
            "all": "level=4|class=Sorcerer"
          }
        ]
      }
    }
  ],
  "subclassTableGroups": [
    {
      "subclasses": [
        {
          "name": "Warrior of the Mystic Arts",
          "source": "AU"
        }
      ],
      "colLabels": [
        "{@filter Prepared Spells|spells|subclass=Monk: Warrior of the Mystic Arts}"
      ],
      "rows": [
        [
          0
        ],
        [
          0
        ],
        [
          3
        ],
        [
          4
        ],
        [
          4
        ],
        [
          4
        ],
        [
          5
        ],
        [
          6
        ],
        [
          6
        ],
        [
          7
        ],
        [
          8
        ],
        [
          8
        ],
        [
          9
        ],
        [
          10
        ],
        [
          10
        ],
        [
          11
        ],
        [
          11
        ],
        [
          11
        ],
        [
          12
        ],
        [
          13
        ]
      ]
    },
    {
      "title": "Spell Slots per Spell Level",
      "subclasses": [
        {
          "name": "Warrior of the Mystic Arts",
          "source": "AU"
        }
      ],
      "colLabels": [
        "{@filter 1st|spells|level=1|subclass=Monk: Warrior of the Mystic Arts}",
        "{@filter 2nd|spells|level=2|subclass=Monk: Warrior of the Mystic Arts}",
        "{@filter 3rd|spells|level=3|subclass=Monk: Warrior of the Mystic Arts}",
        "{@filter 4th|spells|level=4|subclass=Monk: Warrior of the Mystic Arts}"
      ],
      "rowsSpellProgression": [
        [
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0
        ],
        [
          2,
          0,
          0,
          0
        ],
        [
          3,
          0,
          0,
          0
        ],
        [
          3,
          0,
          0,
          0
        ],
        [
          3,
          0,
          0,
          0
        ],
        [
          4,
          2,
          0,
          0
        ],
        [
          4,
          2,
          0,
          0
        ],
        [
          4,
          2,
          0,
          0
        ],
        [
          4,
          3,
          0,
          0
        ],
        [
          4,
          3,
          0,
          0
        ],
        [
          4,
          3,
          0,
          0
        ],
        [
          4,
          3,
          2,
          0
        ],
        [
          4,
          3,
          2,
          0
        ],
        [
          4,
          3,
          2,
          0
        ],
        [
          4,
          3,
          3,
          0
        ],
        [
          4,
          3,
          3,
          0
        ],
        [
          4,
          3,
          3,
          0
        ],
        [
          4,
          3,
          3,
          1
        ],
        [
          4,
          3,
          3,
          1
        ]
      ]
    }
  ],
  "subclassFeatures": [
    "Warrior of the Mystic Arts|Monk|XPHB|Mystic Arts|AU|3|AU",
    "Mystic Fighting Style|Monk|XPHB|Mystic Arts|AU|6|AU",
    "Mystic Focus|Monk|XPHB|Mystic Arts|AU|6|AU",
    "Focused Strike|Monk|XPHB|Mystic Arts|AU|11|AU",
    "Improved Mystic Fighting Style|Monk|XPHB|Mystic Arts|AU|17|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Warrior of the Mystic Arts

> Source: AU, p. 11

*Weave Martial and Mystic Arts*

Warriors of the Mystic Arts wield magic to supplement their martial skill. They harness mystical focus to enhance their magical and physical abilities.

#### Spellcasting

> Source: AU, p. 11

You have learned to cast spells. See the Player's Handbook for the rules on spellcasting. The information below details how you use those rules as a Warrior of the Mystic Arts.

##### Cantrips

You know two cantrips of your choice from the class=Sorcerer. Blade Ward and Thunderclap are recommended. Whenever you gain a Monk level, you can replace one of these cantrips with another cantrip of your choice from the class=Sorcerer.

When you reach Monk level 10, you learn another level=0 of your choice.

<details><summary>Structured source fields</summary>

```json
{
  "page": 11
}
```

</details>

##### Spell Slots

The Warrior of the Mystic Arts Spellcasting table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "page": 11
}
```

</details>

##### Prepared Spells of Level 1+

You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose three level 1 spells from the class=Sorcerer. Jump, Magic Missile, and Shield are recommended.

The number of spells on your list increases as you gain Monk levels, as shown in the Prepared Spells column of the Warrior of the Mystic Arts Spellcasting table. Whenever that number increases, choose additional spells from the class=Sorcerer until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots. For example, if you're a level 7 Monk, your list of prepared spells can include five Sorcerer spells of levels 1 and 2 in any combination.

<details><summary>Structured source fields</summary>

```json
{
  "page": 11
}
```

</details>

##### Changing Your Prepared Spells

Whenever you gain a Monk level, you can replace one spell on your list with another class=Sorcerer for which you have spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

##### Spellcasting Ability

Wisdom is your spellcasting ability for your Sorcerer spells.

<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

##### Spellcasting Focus

You can use an Arcane Focus as a Spellcasting Focus for your Sorcerer spells.

<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

##### Multiclassing

If you multiclass and have the Spellcasting feature from more than one class, add one third of your Monk levels (round down) to determine your available spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 11,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 11,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Mystic Fighting Style

> Source: AU, p. 12

When you take the Attack action on your turn, you can replace one Unarmed Strike with a casting of one of your Sorcerer cantrips that has a casting time of an action.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 12,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Mystic Focus

> Source: AU, p. 12

You keep your magical power and martial focus in perfect balance, allowing you to convert spell slots into Focus Points, or convert Focus Points into spell slots.

##### Converting Spell Slots to Focus Points

You can expend a spell slot to regain a number of expended Focus Points equal to the slot's level (no action required).

<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

##### Recovering Spell Slots

When you finish a Short Rest or use Uncanny Metabolism, you can transform unexpended Focus Points to recover one expended spell slot. The Recovering Spell Slots table shows the cost of recovering a spell slot of a given level, and it lists the minimum Monk level you must be to recover a slot. You can recover a spell slot no higher than level 4.

###### Recovering Spell Slots

| Spell Slot Level | Focus Point Cost | Min. Monk Level |
| --- | --- | --- |
| 1 | 2 | 6 |
| 2 | 3 | 7 |
| 3 | 5 | 13 |
| 4 | 6 | 19 |



<details><summary>Structured source fields</summary>

```json
{
  "page": 12
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 12,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Focused Strike

> Source: AU, p. 13

When you use your Stunning Strike, whether the target succeeds or fails on the saving throw, the target has Disadvantage on saving throws against your spells until the start of your next turn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 13,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 11,
  "header": 2
}
```

</details>

#### Improved Mystic Fighting Style

> Source: AU, p. 13

When you use Flurry of Blows, you can replace two of the Unarmed Strikes with a casting of one of your level 1 or 2 Sorcerer spells that has a casting time of an action, and you cast it as part of the same Bonus Action you use to activate Flurry of Blows.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 13,
  "className": "Monk",
  "classSource": "XPHB",
  "subclassShortName": "Mystic Arts",
  "subclassSource": "AU",
  "level": 17,
  "header": 2
}
```

</details>

### Vestige Patron

> Source: AU, p. 13

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Vestige",
  "source": "AU",
  "className": "Warlock",
  "classSource": "XPHB",
  "page": 13,
  "edition": "one",
  "additionalSpells": [
    {
      "name": "Life Domain",
      "prepared": {
        "3": [
          "aid|xphb",
          "bless|xphb",
          "cure wounds|xphb",
          "lesser restoration|xphb"
        ],
        "5": [
          "mass healing word|xphb",
          "revivify|xphb"
        ],
        "7": [
          "aura of life|xphb",
          "death ward|xphb"
        ],
        "9": [
          "greater restoration|xphb",
          "mass cure wounds|xphb"
        ]
      }
    },
    {
      "name": "Light Domain",
      "prepared": {
        "3": [
          "burning hands|xphb",
          "faerie fire|xphb",
          "scorching ray|xphb",
          "see invisibility|xphb"
        ],
        "5": [
          "daylight|xphb",
          "fireball|xphb"
        ],
        "7": [
          "arcane eye|xphb",
          "wall of fire|xphb"
        ],
        "9": [
          "flame strike|xphb",
          "scrying|xphb"
        ]
      }
    },
    {
      "name": "Trickery Domain",
      "prepared": {
        "3": [
          "charm person|xphb",
          "disguise self|xphb",
          "invisibility|xphb",
          "pass without trace|xphb"
        ],
        "5": [
          "hypnotic pattern|xphb",
          "nondetection|xphb"
        ],
        "7": [
          "confusion|xphb",
          "dimension door|xphb"
        ],
        "9": [
          "dominate person|xphb",
          "modify memory|xphb"
        ]
      }
    },
    {
      "name": "War Domain",
      "prepared": {
        "3": [
          "guiding bolt|xphb",
          "magic weapon|xphb",
          "shield of faith|xphb",
          "spiritual weapon|xphb"
        ],
        "5": [
          "crusader's mantle|xphb",
          "spirit guardians|xphb"
        ],
        "7": [
          "fire shield|xphb",
          "freedom of movement|xphb"
        ],
        "9": [
          "hold monster|xphb",
          "steel wind strike|xphb"
        ]
      }
    }
  ],
  "subclassFeatures": [
    "Vestige Patron|Warlock|XPHB|Vestige|AU|3|AU",
    "Vestige Power|Warlock|XPHB|Vestige|AU|6|AU",
    "Vestige Recovery|Warlock|XPHB|Vestige|AU|10|AU",
    "Semblance of Life|Warlock|XPHB|Vestige|AU|14|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Vestige Patron

> Source: AU, p. 13

*Wield the Remnants of a Dying God's Power*

Your pact draws on the power of a dying god, a being once worshipped by countless followers but now abandoned and forgotten. This dying god, known as a vestige, might have been benevolent, evil, or strange and unknowable, but now it is driven to regain its former power. The vestige needs your help, and it is willing to share its remaining strength with you.

#### Vestige Companion

> Source: AU, p. 13

The vestige manifests, drawing strength from your pact. It uses the Vestige Companion stat block and is a Celestial, Fiend, or Undead (choose when you gain this feature). You determine what the vestige looks like, but regardless of its form, the vestige bears features indicating its supernatural origin. For example, you might decide your vestige is an oversize floating skull etched with sigils, a circle of glowing runes, or a constantly shifting abstract shape. The vestige is Friendly to you and your allies and obeys your commands. It vanishes if you die.

##### The Vestige in Combat

In combat, the vestige acts during your turn. It can move and use its Reaction on its own, but the only action it takes is the Dodge action unless you take a Bonus Action to command it to take an action in its stat block or some other action. You can also sacrifice one of your attacks when you take the Attack action to command the vestige to take the Vestige's Strike action. If you have the Incapacitated condition, the vestige acts on its own and isn't limited to the Dodge action.

<details><summary>Structured source fields</summary>

```json
{
  "page": 13
}
```

</details>

##### Disappearance of the Vestige

When the vestige drops to 0 Hit Points, it disappears. You can spend 1 minute performing a magical ceremony to manifest the vestige again; it reappears with its maximum Hit Points in an unoccupied space within 5 feet of you. As a Magic action, you can temporarily dismiss the vestige to a pocket dimension. As a Magic action while it is temporarily dismissed, you can cause the vestige to reappear in an unoccupied space within 30 feet of you. Whenever the vestige drops to 0 Hit Points or disappears into the pocket dimension, it leaves behind in its space anything it was wearing or carrying.

###### Vestige Companion

> Source: AU, p. 14

###### Traits

###### Pact Bond

Add your Proficiency Bonus to any ability check or saving throw the vestige makes.

###### Actions

###### Vestige's Strike

m,r Bonus equals your spell attack modifier, reach 5 ft. or range 60 ft. Hit:1d6 + 3 plus your Charisma modifier Fire (Fiend), Necrotic (Undead), or Radiant (Celestial) damage.

###### Bonus Actions

###### Divine Power (1/Day)

Your vestige manifests a remnant of its divine power in one of the following ways, based on its form:

###### Cursed Invocation (Undead Only)

The vestige places a curse on a creature you can see within 30 feet of the vestige for 1 minute. While cursed, the target has Disadvantage on attack rolls against you and the vestige.

###### Fiendish Swap (Fiend Only)

If you and the vestige are within 60 feet of each other, you both teleport, swapping places.

###### Healing Touch (Celestial Only)

The vestige touches another creature. The target regains Hit Points equal to 2d8 plus your Charisma modifier and ends one condition on it: Blinded, Deafened, or Poisoned.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 14,
  "summonedByClass": "Warlock|XPHB",
  "size": [
    "S"
  ],
  "alignment": [
    "N"
  ],
  "ac": [
    {
      "special": "13 + your Charisma modifier"
    }
  ],
  "hp": {
    "special": "4 + four times your Warlock level (the vestige has a number of Hit Dice [d6s] equal to your Warlock level)"
  },
  "speed": {
    "walk": 5,
    "fly": {
      "number": 30,
      "condition": "(hover)"
    },
    "canHover": true
  },
  "str": 1,
  "dex": 14,
  "con": 10,
  "int": 15,
  "wis": 15,
  "cha": 16,
  "passive": 12,
  "resist": [
    {
      "resist": [
        "fire"
      ],
      "note": "(Fiend only)",
      "cond": true
    },
    {
      "resist": [
        "necrotic"
      ],
      "note": "(Undead only)",
      "cond": true
    },
    {
      "resist": [
        "radiant"
      ],
      "note": "(Celestial only)",
      "cond": true
    }
  ],
  "conditionImmune": [
    "charmed",
    "frightened",
    "prone"
  ],
  "languages": [
    "speaks the languages you know"
  ],
  "pbNote": "equals your Proficiency Bonus",
  "damageTags": [
    "F",
    "N",
    "R"
  ],
  "miscTags": [
    "MA",
    "RA"
  ],
  "hasToken": true,
  "_versions": [
    {
      "name": "Vestige Companion (Celestial)",
      "source": "AU",
      "_mod": {
        "action": {
          "mode": "replaceArr",
          "replace": "Vestige's Strike",
          "items": {
            "name": "Vestige's Strike",
            "entries": [
              "{@atkr m,r} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. or range 60 ft. {@h}{@damage 1d6 + 3} plus your Charisma modifier Radiant damage."
            ]
          }
        },
        "bonus": {
          "mode": "replaceArr",
          "replace": "Divine Power (1/Day)",
          "items": {
            "name": "Divine Power (1/Day)",
            "entries": [
              {
                "type": "entries",
                "name": "Healing Touch",
                "entries": [
                  "The vestige touches another creature. The target regains {@variantrule Hit Points|XPHB} equal to {@dice 2d8} plus your Charisma modifier and ends one condition on it: {@condition Blinded|XPHB}, {@condition Deafened|XPHB}, or {@condition Poisoned|XPHB}."
                ]
              }
            ]
          }
        }
      },
      "type": "celestial",
      "resist": [
        "radiant"
      ],
      "damageTags": [
        "R"
      ]
    },
    {
      "name": "Vestige Companion (Fiend)",
      "source": "AU",
      "_mod": {
        "action": {
          "mode": "replaceArr",
          "replace": "Vestige's Strike",
          "items": {
            "name": "Vestige's Strike",
            "entries": [
              "{@atkr m,r} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. or range 60 ft. {@h}{@damage 1d6 + 3} plus your Charisma modifier Fire damage."
            ]
          }
        },
        "bonus": {
          "mode": "replaceArr",
          "replace": "Divine Power (1/Day)",
          "items": {
            "name": "Divine Power (1/Day)",
            "entries": [
              {
                "type": "entries",
                "name": "Fiendish Swap",
                "entries": [
                  "If you and the vestige are within 60 feet of each other, you both teleport, swapping places."
                ]
              }
            ]
          }
        }
      },
      "type": "fiend",
      "resist": [
        "fire"
      ],
      "damageTags": [
        "F"
      ]
    },
    {
      "name": "Vestige Companion (Undead)",
      "source": "AU",
      "_mod": {
        "action": {
          "mode": "replaceArr",
          "replace": "Vestige's Strike",
          "items": {
            "name": "Vestige's Strike",
            "entries": [
              "{@atkr m,r} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. or range 60 ft. {@h}{@damage 1d6 + 3} plus your Charisma modifier Necrotic damage."
            ]
          }
        },
        "bonus": {
          "mode": "replaceArr",
          "replace": "Divine Power (1/Day)",
          "items": {
            "name": "Divine Power (1/Day)",
            "entries": [
              {
                "type": "entries",
                "name": "Cursed Invocation",
                "entries": [
                  "The vestige places a curse on a creature you can see within 30 feet of the vestige for 1 minute. While cursed, the target has {@variantrule Disadvantage|XPHB} on attack rolls against you and the vestige."
                ]
              }
            ]
          }
        }
      },
      "type": "undead",
      "resist": [
        "necrotic"
      ],
      "damageTags": [
        "N"
      ]
    }
  ]
}
```

</details>



Whenever you finish a Long Rest, you can summon the vestige in a new form, which appears in an unoccupied space within 5 feet of you. You choose its appearance and whether it is a Celestial, Fiend, or Undead. If the vestige is already manifested from this feature, its form changes to the new one.

<details><summary>Structured source fields</summary>

```json
{
  "page": 13
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 13,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Vestige Spells

> Source: AU, p. 14

The magic of your Vestige Companion ensures you always have certain spells ready. Select one of the following Cleric domains: Life, Light, Trickery, or War. The Domain Spells of your chosen domain are Warlock spells for you. When you reach a Warlock level equal to a Cleric level listed on the Domain Spells table for the domain you have chosen, you thereafter always have the listed spells prepared.

For example, if you chose the War Domain for this feature, when you reach Warlock level 3, you would have the Guiding Bolt, Magic Weapon, Shield of Faith, and Spiritual Weapon spells prepared.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 14,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 13,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Vestige Power

> Source: AU, p. 14

Your Vestige Companion now regains its use of Divine Power whenever you finish a Short or Long Rest or when you use your Magical Cunning feature. In addition, while within 30 feet of your Vestige Companion, you have Resistance to the same damage types as the vestige.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 14,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Vestige Recovery

> Source: AU, p. 14

When your Vestige Companion would drop to 0 Hit Points, you can take a Reaction and expend a Pact Magic spell slot to instead change its Hit Points to its Hit Point maximum. The vestige then teleports to an unoccupied space you can see within 30 feet of it. Once you use this feature, you can't do so again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 14,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Semblance of Life

> Source: AU, p. 14

Your Vestige Companion continues to grow in strength, and with your assistance, it can briefly adopt a more powerful form. Depending on the vestige's type, you can take a Magic action while the vestige is within 90 feet of you to shape-shift it for 1 hour into one of the following forms: **Celestial Spirit** (Celestial vestige; see the Summon Celestial spell in the 9), **Fiendish Spirit** (Fiend vestige; see the Summon Fiend spell in the 9), or **Undead Spirit** (Undead vestige; see the Summon Undead spell in the 9). The vestige's game statistics are replaced by the spirit's stat block, and the spell's level is equal to half your Warlock level (round down; maximum level 9), but the vestige retains its personality, Divine Power Bonus Action, Hit Points, and Hit Point Dice.

The vestige gains a number of Temporary Hit Points equal to the Hit Points of the spirit form. These Temporary Hit Points vanish if any remain after 1 hour, and the transformation ends early if it has no Temporary Hit Points left.

Once you use this feature, you can't do so again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 14,
  "className": "Warlock",
  "classSource": "XPHB",
  "subclassShortName": "Vestige",
  "subclassSource": "AU",
  "level": 14,
  "header": 2
}
```

</details>

### Conjurer

> Source: AU, p. 15

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Conjurer",
  "source": "AU",
  "className": "Wizard",
  "classSource": "XPHB",
  "page": 15,
  "edition": "one",
  "additionalSpells": [
    {
      "known": {
        "3": [
          {
            "choose": "level=0;1;2|class=Wizard|school=C"
          },
          {
            "choose": "level=0;1;2|class=Wizard|school=C"
          }
        ],
        "5": [
          {
            "choose": "level=0;1;2;3|class=Wizard|school=C"
          }
        ],
        "7": [
          {
            "choose": "level=0;1;2;3;4|class=Wizard|school=C"
          }
        ],
        "9": [
          {
            "choose": "level=0;1;2;3;4;5|class=Wizard|school=C"
          }
        ],
        "11": [
          {
            "choose": "level=0;1;2;3;4;5;6|class=Wizard|school=C"
          }
        ],
        "13": [
          {
            "choose": "level=0;1;2;3;4;5;6;7|class=Wizard|school=C"
          }
        ],
        "15": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8|class=Wizard|school=C"
          }
        ],
        "17": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=C"
          }
        ]
      }
    }
  ],
  "subclassFeatures": [
    "Conjurer|Wizard|XPHB|Conjurer|AU|3|AU",
    "Distant Transposition|Wizard|XPHB|Conjurer|AU|6|AU",
    "Durable Summons|Wizard|XPHB|Conjurer|AU|6|AU",
    "Focused Conjuration|Wizard|XPHB|Conjurer|AU|10|AU",
    "Splintered Summons|Wizard|XPHB|Conjurer|AU|14|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Conjurer

> Source: AU, p. 15

*Step Across Space and Call Creatures from Thin Air*

A Conjurer considers distance and matter to be flexible guidelines rather than physical laws. Conjurers master magic that moves creatures instantly through space and summons creatures to fight on their behalf.

#### Benign Transposition

> Source: AU, p. 15

As a Bonus Action, you teleport up to 30 feet to an unoccupied space that you can see. Alternatively, you can choose a space within range that is occupied by a Medium or smaller creature. If that creature is willing, you both teleport, swapping places.

You can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 15,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Conjuration Savant

> Source: AU, p. 15

Choose two level=0;1;2, each of which must be no higher than level 2, and add them to your spellbook for free.

In addition, whenever you gain access to a new level of spell slots in this class, you can add one class=Wizard to your spellbook for free. The chosen spell must be of a level for which you have spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 15,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 15,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Distant Transposition

> Source: AU, p. 15

The range of your Benign Transposition feature increases to 60 feet. Additionally, you can restore one use of it by expending a level 3+ spell slot (no action required).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 15,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Durable Summons

> Source: AU, p. 16

When you cast a school=C to summon or create a creature using a spell slot, that creature gains Temporary Hit Points equal to twice your Wizard level when it first appears. While it has these Temporary Hit Points, the creature has Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Focused Conjuration

> Source: AU, p. 16

Taking damage can't break your Concentration on school=C.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Splintered Summons

> Source: AU, p. 16

When you use a spell slot to cast a school=C that summons a spirit whose stat block is included in the spell description, such as Summon Aberration, you can modify the spell to summon two creatures with the spell instead of one. Each creature is of the same kind, uses the stat block and rules denoted by the spell, and manifests in a different unoccupied space of your choice within the spell's range, but the summoned creatures' Hit Point maximums and current Hit Points are halved. If you lose Concentration on the spell, both creatures disappear.

Once you use this feature to modify a spell in this way, you must finish a Long Rest before you can do so again. You can also restore your use of it by expending a level 5+ spell slot (no action required).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Conjurer",
  "subclassSource": "AU",
  "level": 14,
  "header": 2
}
```

</details>

### Enchanter

> Source: AU, p. 16

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Enchanter",
  "source": "AU",
  "className": "Wizard",
  "classSource": "XPHB",
  "page": 16,
  "edition": "one",
  "additionalSpells": [
    {
      "known": {
        "3": [
          {
            "choose": "level=0;1;2|class=Wizard|school=E"
          },
          {
            "choose": "level=0;1;2|class=Wizard|school=E"
          }
        ],
        "5": [
          {
            "choose": "level=0;1;2;3|class=Wizard|school=E"
          }
        ],
        "7": [
          {
            "choose": "level=0;1;2;3;4|class=Wizard|school=E"
          }
        ],
        "9": [
          {
            "choose": "level=0;1;2;3;4;5|class=Wizard|school=E"
          }
        ],
        "11": [
          {
            "choose": "level=0;1;2;3;4;5;6|class=Wizard|school=E"
          }
        ],
        "13": [
          {
            "choose": "level=0;1;2;3;4;5;6;7|class=Wizard|school=E"
          }
        ],
        "15": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8|class=Wizard|school=E"
          }
        ],
        "17": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=E"
          }
        ]
      }
    }
  ],
  "subclassFeatures": [
    "Enchanter|Wizard|XPHB|Enchanter|AU|3|AU",
    "Split Enchantment|Wizard|XPHB|Enchanter|AU|6|AU",
    "Instinctive Charm|Wizard|XPHB|Enchanter|AU|10|AU",
    "Alter Memories|Wizard|XPHB|Enchanter|AU|14|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Enchanter

> Source: AU, p. 16

*Entrance and Beguile Others*

An Enchanter's magic clouds or captivates minds. Some Enchanters use their abilities to encourage peace and soften cruelty, while others use their mind-altering magic for selfish ends.

#### Enchanting Conversationalist

> Source: AU, p. 16

You gain proficiency in one of the following skills of your choice: Deception, Intimidation, or Persuasion.

In addition, when you make an ability check with the chosen skill, you gain a bonus to the check equal to your Intelligence modifier (minimum of +1).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Enchantment Savant

> Source: AU, p. 16

Choose two level=0;1;2, each of which must be no higher than level 2, and add them to your spellbook for free.

In addition, whenever you gain access to a new level of spell slots in this class, you can add one class=Wizard to your spellbook for free. The chosen spell must be of a level for which you have spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Hypnotic Presence

> Source: AU, p. 17

Your charming words and enchanting gaze can enthrall another creature. As a Magic action, choose one creature that you can see within 10 feet of yourself. If the target can see or hear you, it must succeed on a Wisdom saving throw against your spell save DC or have the Charmed condition for 1 minute or until the target is more than 10 feet away from you, the target can neither see nor hear you, or the target takes damage. While Charmed, the target has the Incapacitated condition and a Speed of 0.

You can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 16,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Split Enchantment

> Source: AU, p. 17

When you use a spell slot to cast an school=E, such as Charm Person, that can be cast with a higher-level spell slot to target an additional creature, you can increase the spell's effective level by 1.

You can use this feature a number of times equal to your Intelligence modifier, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Instinctive Charm

> Source: AU, p. 17

When a creature within 30 feet of you that you can see hits you with an attack roll, you can take a Reaction to force the attacker to make a Wisdom saving throw against your spell save DC. On a failed save, the attack misses instead, and if there is another creature within range of the attack other than the attacker, the attacker targets that creature with the triggering attack, using the same attack roll. If multiple creatures are within the attack's range, you choose which one to target.

Once you take this Reaction, you can't do so again until you finish a Long Rest. You can also restore your use of it by casting an school=E with a spell slot.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Alter Memories

> Source: AU, p. 17

You can make a creature unaware of your magical influence. When you cast an school=E that imposes the Charmed condition using a spell slot, you can choose one creature targeted by the spell. That creature remains unaware of being Charmed by you.

In addition, once before the spell ends, you can take a Magic action to force the chosen creature to make an Intelligence saving throw against your spell save DC. On a failed save, you can make the creature lose a number of hours of its memories equal to 1 plus your Intelligence modifier (minimum of 1 hour lost). You can make the creature forget less time, and the amount of time can't exceed the duration of your school=E.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Enchanter",
  "subclassSource": "AU",
  "level": 14,
  "header": 2
}
```

</details>

### Necromancer

> Source: AU, p. 17

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Necromancer",
  "source": "AU",
  "className": "Wizard",
  "classSource": "XPHB",
  "page": 17,
  "edition": "one",
  "additionalSpells": [
    {
      "known": {
        "3": [
          "find familiar|xphb",
          {
            "choose": "level=0;1;2|class=Wizard|school=N"
          },
          {
            "choose": "level=0;1;2|class=Wizard|school=N"
          }
        ],
        "5": [
          {
            "choose": "level=0;1;2;3|class=Wizard|school=N"
          }
        ],
        "7": [
          {
            "choose": "level=0;1;2;3;4|class=Wizard|school=N"
          }
        ],
        "9": [
          {
            "choose": "level=0;1;2;3;4;5|class=Wizard|school=N"
          }
        ],
        "11": [
          {
            "choose": "level=0;1;2;3;4;5;6|class=Wizard|school=N"
          }
        ],
        "13": [
          {
            "choose": "level=0;1;2;3;4;5;6;7|class=Wizard|school=N"
          }
        ],
        "15": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8|class=Wizard|school=N"
          }
        ],
        "17": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=N"
          }
        ]
      },
      "prepared": {
        "6": [
          "animate dead|xphb"
        ]
      },
      "innate": {
        "6": {
          "daily": {
            "1": [
              "animate dead|xphb"
            ]
          }
        }
      }
    }
  ],
  "subclassFeatures": [
    "Necromancer|Wizard|XPHB|Necromancer|AU|3|AU",
    "Grave Power|Wizard|XPHB|Necromancer|AU|6|AU",
    "Undead Thralls|Wizard|XPHB|Necromancer|AU|6|AU",
    "Harvest Undead|Wizard|XPHB|Necromancer|AU|10|AU",
    "Death's Master|Wizard|XPHB|Necromancer|AU|14|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Necromancer

> Source: AU, p. 17

*Command the Powers of Death and Undeath*

You explore the forces of life, death, and undeath. As a necromancer, you learn to manipulate the energy that animates all creatures, and you draw increasing power from the forbidden secrets in your spellbook. Though many see Necromancers as menacing or villainous, not all Necromancers are evil.

#### Necromancy Savant

> Source: AU, p. 17

Choose two level=0;1;2, each of which must be no higher than level 2, and add them to your spellbook for free.

In addition, whenever you gain access to a new level of spell slots in this class, you can add one class=Wizard to your spellbook for free. The chosen spell must be of a level for which you have spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Necromancy Spellbook

> Source: AU, p. 17

Your spellbook's necromantic secrets grant you additional powers. You gain the following benefits.

##### Necrotic Resistance

You have Resistance to Necrotic damage.

<details><summary>Structured source fields</summary>

```json
{
  "page": 17
}
```

</details>

##### Undead Familiar

The Find Familiar spell appears in your spellbook. When you cast the spell, you choose one of the normal forms for your familiar or one of the following special forms: Skeleton or Zombie (see appendix B of the 11 for the familiar's stat block). When you choose one of the normal forms, you can choose Undead as its creature type.

Additionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one attack of its own with its Reaction.

<details><summary>Structured source fields</summary>

```json
{
  "page": 17
}
```

</details>

##### Undead Vitality

When you cast a school=N using a spell slot, you can choose an Undead creature you can see within 60 feet of yourself to regain a number of Hit Points equal to the level of the spell slot expended plus your Wizard level.

<details><summary>Structured source fields</summary>

```json
{
  "page": 17
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Grave Power

> Source: AU, p. 17

You have discovered more necromantic insights and inscribed them in your spellbook. While holding your spellbook, you gain the following benefits.

##### Grave Resilience

When you use Arcane Recovery, your Exhaustion level, if any, decreases by 1.

<details><summary>Structured source fields</summary>

```json
{
  "page": 17
}
```

</details>

##### Overwhelming Necrosis

Damage from your Wizard spells and Wizard features ignores Resistance to Necrotic damage.

<details><summary>Structured source fields</summary>

```json
{
  "page": 17
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 17,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Undead Thralls

> Source: AU, p. 18

You always have Animate Dead prepared and can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again. Whenever you start casting the spell, you can increase the spell's effective level by 1.

In addition, while holding your spellbook, you gain the following benefits.

##### Undead Fortitude

Whenever you cast a school=N that creates or summons an Undead, the Undead's Hit Point maximum and current Hit Points increase by a number equal to your Intelligence modifier plus half your Wizard level (round down).

<details><summary>Structured source fields</summary>

```json
{
  "page": 18
}
```

</details>

##### Withering Strike

Whenever an Undead you control within 60 feet of you hits a creature with an attack roll, the Undead deals extra Necrotic damage equal to your Intelligence modifier (minimum of 1 Necrotic damage).

<details><summary>Structured source fields</summary>

```json
{
  "page": 18
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 18,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Harvest Undead

> Source: AU, p. 18

You have learned more secrets about the nuances of life and death. Immediately after you become Bloodied but aren't reduced to 0 Hit Points from taking damage, you can take a Reaction to reduce an Undead creature under your control that you can see to 0 Hit Points. You then immediately regain a number of Hit Points equal to your Wizard level.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 18,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Death's Master

> Source: AU, p. 18

Abstruse rituals within your spellbook allow you mastery over undeath. While holding your spellbook, you gain the following benefits.

##### Bolster Undead

As a Bonus Action, choose any number of Undead you have created or summoned with a school=N that are within 60 feet of you. Those Undead each gain Temporary Hit Points equal to your Wizard level. Once you use this Bonus Action, you can't do so again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "page": 18
}
```

</details>

##### Extinguish Undead

When an Undead creature you can see is reduced to 0 Hit Points, you can cause it to explode with necrotic energy. Roll a number of d6s equal to half the creature's unexpended Hit Dice (round up, minimum of 1d6), and add them together. Each creature in a 10-foot Emanation originating from the Undead makes a Dexterity saving throw. On a failed save, a target takes Necrotic damage equal to the number rolled and can't take Reactions until the start of its next turn. On a successful save, a target takes half as much damage only. When you use this feature to explode an Undead creature you don't control, you must take a Reaction and expend a level 5+ spell slot to do so.

<details><summary>Structured source fields</summary>

```json
{
  "page": 18
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 18,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Necromancer",
  "subclassSource": "AU",
  "level": 14,
  "header": 2
}
```

</details>

### Transmuter

> Source: AU, p. 19

<details><summary>Structured source fields</summary>

```json
{
  "shortName": "Transmuter",
  "source": "AU",
  "className": "Wizard",
  "classSource": "XPHB",
  "page": 19,
  "edition": "one",
  "additionalSpells": [
    {
      "known": {
        "3": [
          {
            "choose": "level=0;1;2|class=Wizard|school=T"
          },
          {
            "choose": "level=0;1;2|class=Wizard|school=T"
          }
        ],
        "5": [
          {
            "choose": "level=0;1;2;3|class=Wizard|school=T"
          }
        ],
        "7": [
          {
            "choose": "level=0;1;2;3;4|class=Wizard|school=T"
          }
        ],
        "9": [
          {
            "choose": "level=0;1;2;3;4;5|class=Wizard|school=T"
          }
        ],
        "11": [
          {
            "choose": "level=0;1;2;3;4;5;6|class=Wizard|school=T"
          }
        ],
        "13": [
          {
            "choose": "level=0;1;2;3;4;5;6;7|class=Wizard|school=T"
          }
        ],
        "15": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8|class=Wizard|school=T"
          }
        ],
        "17": [
          {
            "choose": "level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=T"
          }
        ]
      },
      "prepared": {
        "3": [
          "alter self|xphb"
        ],
        "10": [
          "polymorph|xphb"
        ]
      },
      "innate": {
        "3": {
          "daily": {
            "1": [
              "alter self|xphb"
            ]
          }
        },
        "10": {
          "daily": {
            "1": [
              "polymorph|xphb"
            ]
          }
        }
      }
    }
  ],
  "subclassFeatures": [
    "Transmuter|Wizard|XPHB|Transmuter|AU|3|AU",
    "Empowered Transmutation|Wizard|XPHB|Transmuter|AU|6|AU",
    "Potent Stone|Wizard|XPHB|Transmuter|AU|10|AU",
    "Shape-Shifter|Wizard|XPHB|Transmuter|AU|10|AU",
    "Master Transmuter|Wizard|XPHB|Transmuter|AU|14|AU"
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>

#### Transmuter

> Source: AU, p. 19

*Transform Energy and Matter*

You study spells that modify energy and matter—to you, the world is eminently mutable. Using your magic, you become a smith at reality's forge.

Some Transmuters are tinkerers and pranksters. Others seek the power to make and destroy worlds.

#### Transmutation Savant

> Source: AU, p. 19

Choose two level=0;1;2, each of which must be no higher than level 2, and add them to your spellbook for free.

In addition, whenever you gain access to a new level of spell slots in this class, you can add one class=Wizard to your spellbook for free. The chosen spell must be of a level for which you have spell slots.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 19,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Transmuter's Stone

> Source: AU, p. 19

When you finish a Long Rest, you can create a magic stone that lasts until you use this feature again. The stone is a Tiny object, and you can use it as a Spellcasting Focus for your Wizard spells. A creature with the stone in its possession gains proficiency in Constitution saving throws and one of the following benefits, which you choose when you create the stone. You can change the stone's benefit when you cast a school=T using a spell slot.

##### Darkvision

The bearer gains Darkvision with a range of 60 feet or increases the range of its Darkvision by 60 feet.

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

##### Resistance

The bearer gains Resistance to Acid, Cold, Fire, Lightning, Poison, or Thunder damage (your choice each time you choose this benefit).

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

##### Speed

The bearer's Speed increases by 10 feet.

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 19,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

#### Wondrous Alteration

> Source: AU, p. 19

You always have the Alter Self spell prepared and can cast it once without expending a spell slot. You regain the ability to cast it in this way when you finish a Long Rest.

While under the effects of Alter Self, you gain an additional benefit for each of its options.

##### Aquatic Adaptation

While underwater, you can take the Dash action as a Bonus Action.

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

##### Change Appearance

You have Advantage on Charisma (Deception) checks.

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

##### Natural Weapons

The damage of your new growth increases to 2d6 damage of the type associated with the growth. You also have Advantage on Constitution saving throws to maintain Concentration.

<details><summary>Structured source fields</summary>

```json
{
  "page": 19
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 19,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 3,
  "header": 1
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 19,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 3
}
```

</details>

#### Empowered Transmutation

> Source: AU, p. 20

When you use a spell slot to cast a school=T that doesn't make an attack roll or force a saving throw, such as Fly or Magic Weapon, you can increase the spell's effective level by 1.

You can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 20,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 6,
  "header": 2
}
```

</details>

#### Potent Stone

> Source: AU, p. 20

Your Transmuter's Stone is more versatile. When you create your Transmuter's Stone, you can choose up to two benefits. You can choose each option other than **Resistance** only once. If you choose **Resistance** twice, you must choose different damage types. You can change either or both benefits when you cast a school=T using a spell slot.

In addition, the following are now among your benefit options for Transmuter's Stone.

##### Mighty Build

The bearer has Advantage on Strength saving throws. The bearer also counts as one size larger when determining its carrying capacity.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

##### Tremorsense

The bearer gains Tremorsense with a range of 30 feet.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 20,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Shape-Shifter

> Source: AU, p. 20

You always have the Polymorph spell prepared and can cast it once without expending a spell slot. You regain the ability to cast it in this way when you finish a Long Rest.

In addition, when you target yourself with the spell, you can modify the spell to gain the benefits below. Once you modify the spell using this feature, you can't do so again until you finish a Long Rest.

##### Game Statistics

In addition to retaining the features specified in the spell, you retain your memories and ability to communicate. You also retain your Intelligence, Wisdom, and Charisma scores; proficiencies; class features; and feats.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

##### Transmute Spells

While shape-shifted, you can cast spells, but only school=T that don't have a Material component that has a specified cost or that is consumed by the spell.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 20,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 10,
  "header": 2
}
```

</details>

#### Master Transmuter

> Source: AU, p. 20

While you carry your Transmuter's Stone, you can take a Magic action to consume the reserve of transmutation magic stored inside and choose one of the following benefits. After you use the stone in this way, it crumbles to dust. You can prevent the stone from crumbling by expending a level 7+ spell slot as part of the Magic action you take using this feature.

##### Major Transformation

You can transmute one nonmagical object—no larger than a 10-foot Cube or eight connected 5-foot Cubes—into another nonmagical object of similar size and mass and of equal or lesser value. You must spend 10 minutes handling the object to transform it.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

##### Panacea

You touch a creature as part of this Magic action, and the target regains a number of Hit Points equal to half its Hit Point maximum (round down). The target is cured of all magical contagions, and any curses affecting the target are lifted, including the target's Attunement to a cursed item. If the target has the Poisoned or Petrified condition, those conditions end.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

##### Restore Life

You cast the Raise Dead spell without expending a spell slot, using the stone in place of the required Material components.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

##### Restore Youth

You touch one willing creature as part of this Magic action, and the target's Exhaustion level, if any, decreases to 0, and it permanently appears 3d10 years younger, to a minimum of young adulthood.

<details><summary>Structured source fields</summary>

```json
{
  "page": 20
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 20,
  "className": "Wizard",
  "classSource": "XPHB",
  "subclassShortName": "Transmuter",
  "subclassSource": "AU",
  "level": 14,
  "header": 2
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "007",
  "page": 7
}
```

</details>

## Backgrounds

This section presents ten backgrounds using the same format as those in the 4. These backgrounds are listed in the Backgrounds table. Descriptions of the Origin feats granted by each background can be found later in this chapter.

Nine of these backgrounds connect characters to magical factions presented in chapter 4. These backgrounds describe the training associated with a faction but aren't required for affiliation with or membership in that faction.

The tenth background, Familiar Trainer, supports any character who grew up with a magical animal companion.

### Backgrounds

| Background | Faction |
| --- | --- |
| Agent of the Ninth Quill | x |
| Bejeweled Conclave Spy | x |
| Cosmic Dawn Experiment | x |
| Covenant of the Grave Recruit | x |
| Crucible Storm Chaser | x |
| Familiar Trainer | — |
| Horizon Weaver Initiate | x |
| Phantasmic Circus Trouper | x |
| Seer Apprentice | x |
| Ward of the Sheltering Hands | x |



### Agent of the Ninth Quill

> Source: AU, p. 21

- ##### Ability Scores:
  
  Dexterity, Intelligence, Charisma
- ##### Feat:
  
  Arcane Infiltrator
- ##### Skill Proficiencies:
  
  Arcana and Sleight of Hand
- ##### Tool Proficiencies:
  
  Thieves' Tools
- ##### Equipment:
  
  Choose A or B: (A) Dagger, Light Hammer, Thieves' Tools, Iron Spikes, Rope, Traveler's Clothes, 17 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 21,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "int",
            "cha"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "int",
            "cha"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane infiltrator|au": true
    }
  ],
  "skillProficiencies": [
    {
      "arcana": true,
      "sleight of hand": true
    }
  ],
  "toolProficiencies": [
    {
      "thieves' tools": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "dagger|xphb",
        "light hammer|xphb",
        "thieves' tools|xphb",
        "iron spikes|xphb",
        "rope|xphb",
        "traveler's clothes|xphb",
        {
          "value": 1700
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Bejeweled Conclave Spy

> Source: AU, p. 21

- ##### Ability Scores:
  
  Dexterity, Wisdom, Charisma
- ##### Feat:
  
  Arcane Eloquence
- ##### Skill Proficiencies:
  
  Deception and Perception
- ##### Tool Proficiencies:
  
  Disguise Kit
- ##### Equipment:
  
  Choose A or B: (A) Disguise Kit, Fine Clothes, Perfume, 5 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 21,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "wis",
            "cha"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "wis",
            "cha"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane eloquence|au": true
    }
  ],
  "skillProficiencies": [
    {
      "deception": true,
      "perception": true
    }
  ],
  "toolProficiencies": [
    {
      "disguise kit": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "disguise kit|xphb",
        "fine clothes|xphb",
        "perfume|xphb",
        {
          "value": 500
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Cosmic Dawn Experiment

> Source: AU, p. 22

- ##### Ability Scores:
  
  Strength, Dexterity, Constitution
- ##### Feat:
  
  Transmuted Anatomy
- ##### Skill Proficiencies:
  
  Athletics and Survival
- ##### Tool Proficiencies:
  
  Choose one kind of Artisan's Tools
- ##### Equipment:
  
  Choose A or B: (A) Artisan's Tools (same as above), Backpack, Robe, Traveler's Clothes, 30 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 22,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "dex",
            "con"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "dex",
            "con"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "transmuted anatomy|au": true
    }
  ],
  "skillProficiencies": [
    {
      "athletics": true,
      "survival": true
    }
  ],
  "toolProficiencies": [
    {
      "anyArtisansTool": 1
    }
  ],
  "startingEquipment": [
    {
      "a": [
        {
          "equipmentType": "toolArtisan",
          "displayName": "Artisan's Tools (same as above)"
        },
        "backpack|xphb",
        "robe|xphb",
        "traveler's clothes|xphb",
        {
          "value": 3000
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Covenant of the Grave Recruit

> Source: AU, p. 22

- ##### Ability Scores:
  
  Strength, Intelligence, Wisdom
- ##### Feat:
  
  Arcane Undertaker
- ##### Skill Proficiencies:
  
  History and Medicine
- ##### Tool Proficiencies:
  
  Herbalism Kit
- ##### Equipment:
  
  Choose A or B: (A) Dagger, Herbalism Kit, Book (anatomy), Shovel, 16 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 22,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "int",
            "wis"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "int",
            "wis"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane undertaker|au": true
    }
  ],
  "skillProficiencies": [
    {
      "history": true,
      "medicine": true
    }
  ],
  "toolProficiencies": [
    {
      "herbalism kit": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "dagger|xphb",
        "herbalism kit|xphb",
        {
          "item": "book|xphb",
          "displayName": "Book (anatomy)"
        },
        "shovel|xphb",
        {
          "value": 1600
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Crucible Storm Chaser

> Source: AU, p. 23

- ##### Ability Scores:
  
  Strength, Constitution, Intelligence
- ##### Feat:
  
  Arcane Overload
- ##### Skill Proficiencies:
  
  Athletics and Nature
- ##### Tool Proficiencies:
  
  Glassblower's Tools
- ##### Equipment:
  
  Choose A or B: (A) Glassblower's Tools, Backpack, Rope, Traveler's Clothes, 15 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 23,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "con",
            "int"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "str",
            "con",
            "int"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane overload|au": true
    }
  ],
  "skillProficiencies": [
    {
      "athletics": true,
      "nature": true
    }
  ],
  "toolProficiencies": [
    {
      "glassblower's tools": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "glassblower's tools|xphb",
        "backpack|xphb",
        "rope|xphb",
        "traveler's clothes|xphb",
        {
          "value": 1500
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Familiar Trainer

> Source: AU, p. 23

- ##### Ability Scores:
  
  Constitution, Intelligence, Wisdom
- ##### Feat:
  
  Familiar Friend
- ##### Skill Proficiencies:
  
  Animal Handling and Arcana
- ##### Tool Proficiencies:
  
  Choose one kind of Gaming Set
- ##### Equipment:
  
  Choose A or B: (A) Quarterstaff, Gaming Set (same as above), Bedroll, Bell, String, Tinderbox, Traveler's Clothes, Waterskin, 44 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 23,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "con",
            "int",
            "wis"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "con",
            "int",
            "wis"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "familiar friend|au": true
    }
  ],
  "skillProficiencies": [
    {
      "animal handling": true,
      "arcana": true
    }
  ],
  "toolProficiencies": [
    {
      "anyGamingSet": 1
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "quarterstaff|xphb",
        {
          "equipmentType": "setGaming",
          "displayName": "Gaming Set (same as above)"
        },
        "bedroll|xphb",
        "bell|xphb",
        "string|xphb",
        "tinderbox|xphb",
        "traveler's clothes|xphb",
        "waterskin|xphb",
        {
          "value": 4400
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Horizon Weaver Initiate

> Source: AU, p. 24

- ##### Ability Scores:
  
  Dexterity, Constitution, Wisdom
- ##### Feat:
  
  Portal Jumper
- ##### Skill Proficiencies:
  
  Acrobatics and Survival
- ##### Tool Proficiencies:
  
  Weaver's Tools
- ##### Equipment:
  
  Choose A or B: (A) Shortbow, 20 Arrows, Weaver's Tools, Map, Quiver, Rope, Traveler's Clothes, 18 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 24,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "con",
            "wis"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "con",
            "wis"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "portal jumper|au": true
    }
  ],
  "skillProficiencies": [
    {
      "acrobatics": true,
      "survival": true
    }
  ],
  "toolProficiencies": [
    {
      "weaver's tools": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "shortbow|xphb",
        "arrows (20)|xphb",
        "weaver's tools|xphb",
        "map|xphb",
        "quiver|xphb",
        "rope|xphb",
        "traveler's clothes|xphb",
        {
          "value": 1800
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Phantasmic Circus Trouper

> Source: AU, p. 24

- ##### Ability Scores:
  
  Dexterity, Constitution, Charisma
- ##### Feat:
  
  Arcane Artist
- ##### Skill Proficiencies:
  
  Deception and Performance
- ##### Tool Proficiencies:
  
  Disguise Kit
- ##### Equipment:
  
  Choose A or B: (A) Disguise Kit, Gaming Set (any), Costume, Mirror, Traveler's Clothes, 12 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 24,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "con",
            "cha"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "dex",
            "con",
            "cha"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane artist|au": true
    }
  ],
  "skillProficiencies": [
    {
      "deception": true,
      "performance": true
    }
  ],
  "toolProficiencies": [
    {
      "disguise kit": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "disguise kit|xphb",
        {
          "equipmentType": "setGaming",
          "displayName": "Gaming Set (any)"
        },
        "costume|xphb",
        "mirror|xphb",
        "traveler's clothes|xphb",
        {
          "value": 1200
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Seer Apprentice

> Source: AU, p. 25

- ##### Ability Scores:
  
  Intelligence, Wisdom, Charisma
- ##### Feat:
  
  Arcane Omens
- ##### Skill Proficiencies:
  
  History and Insight
- ##### Tool Proficiencies:
  
  Navigator's Tools
- ##### Equipment:
  
  Choose A or B: (A) Navigator's Tools, 8 Candles, Ink, Ink Pen, Parchment (9 sheets), Pouch, Tinderbox, Traveler's Clothes, 11 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 25,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "int",
            "wis",
            "cha"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "int",
            "wis",
            "cha"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane omens|au": true
    }
  ],
  "skillProficiencies": [
    {
      "history": true,
      "insight": true
    }
  ],
  "toolProficiencies": [
    {
      "navigator's tools": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "navigator's tools|xphb",
        {
          "displayName": "Candles",
          "item": "candle|xphb",
          "quantity": 8
        },
        "ink|xphb",
        "ink pen|xphb",
        {
          "item": "parchment|xphb",
          "displayName": "Parchment (9 sheets)",
          "quantity": 9
        },
        "pouch|xphb",
        "tinderbox|xphb",
        "traveler's clothes|xphb",
        {
          "value": 1100
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



### Ward of the Sheltering Hands

> Source: AU, p. 25

- ##### Ability Scores:
  
  Constitution, Wisdom, Charisma
- ##### Feat:
  
  Arcane Safeguard
- ##### Skill Proficiencies:
  
  Insight and Medicine
- ##### Tool Proficiencies:
  
  Cook's Utensils
- ##### Equipment:
  
  Choose A or B: (A) Cook's Utensils, Blanket, Healer's Kit, Lamp, Oil (3 flasks), Tinderbox, Traveler's Clothes, Waterskin, 40 GP; or (B) 50 GP

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 25,
  "edition": "one",
  "ability": [
    {
      "choose": {
        "weighted": {
          "from": [
            "con",
            "wis",
            "cha"
          ],
          "weights": [
            2,
            1
          ]
        }
      }
    },
    {
      "choose": {
        "weighted": {
          "from": [
            "con",
            "wis",
            "cha"
          ],
          "weights": [
            1,
            1,
            1
          ]
        }
      }
    }
  ],
  "feats": [
    {
      "arcane safeguard|au": true
    }
  ],
  "skillProficiencies": [
    {
      "insight": true,
      "medicine": true
    }
  ],
  "toolProficiencies": [
    {
      "cook's utensils": true
    }
  ],
  "startingEquipment": [
    {
      "a": [
        "cook's utensils|xphb",
        "blanket|xphb",
        "healer's kit|xphb",
        "lamp|xphb",
        {
          "item": "oil|xphb",
          "displayName": "Oil (3 flasks)",
          "quantity": 3
        },
        "tinderbox|xphb",
        "traveler's clothes|xphb",
        "waterskin|xphb",
        {
          "value": 4000
        }
      ],
      "b": [
        {
          "value": 5000
        }
      ]
    }
  ],
  "hasFluff": true,
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "079",
  "page": 20
}
```

</details>

## Feats

This section's feats are organized by category—Origin, General, Fighting Style, or Epic Boon—and alphabetized in each category. All the feats are listed alphabetically in the Feat List table.

### Feat List

| Feat | Category |
| --- | --- |
| Abjuration Adept | General |
| Arcane Artist | Origin |
| Arcane Eloquence | Origin |
| Arcane Infiltrator | Origin |
| Arcane Omens | Origin |
| Arcane Overload | Origin |
| Arcane Safeguard | Origin |
| Arcane Undertaker | Origin |
| Arcane Warrior | Fighting Style |
| Boon of Erupting Spellpower | Epic Boon |
| Boon of Magic School Mastery | Epic Boon |
| Boon of the Iron Mind | Epic Boon |
| Conjuration Adept | General |
| Divination Adept | General |
| Elemental Familiar | General |
| Enchantment Adept | General |
| Evocation Adept | General |
| Familiar Friend | Origin |
| Illusion Adept | General |
| Magic Connoisseur | General |
| Necromancy Adept | General |
| Otherworldly Familiar | General |
| Portal Jumper | Origin |
| Soothing Familiar | General |
| Spell Resistant | General |
| Spell Subterfuge | General |
| Transmutation Adept | General |
| Transmuted Anatomy | Origin |
| Warlike Familiar | General |



Magic can enhance any technique. Show me a hero who eschews magic, and I'll show you one who is limiting their potential.

— Alustriel

<details><summary>Structured source fields</summary>

```json
{
  "id": "085",
  "page": 26
}
```

</details>

### Origin Feats

These feats are in the Origin category.

#### Arcane Artist

> Source: AU, p. 26

You gain the following benefits.

##### Cantrip

You learn the Minor Illusion cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Inspiring Magic

When you cast a spell from the Illusion school, you can choose one ally within 30 feet of yourself who can see you. That ally gains Heroic Inspiration. Once you use this benefit, you can't use it again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 26,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "minor illusion|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Eloquence

> Source: AU, p. 26

You gain the following benefits.

##### Cantrip

You learn the Vicious Mockery cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Smooth Talker

When you make a Charisma (Deception, Intimidation, or Persuasion) check, you can roll 1d4 and add the number rolled to the ability check.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 26,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "vicious mockery|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Infiltrator

> Source: AU, p. 26

You gain the following benefits.

##### Cantrip

You learn the Friends cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Cunning Diversion

You can take the Dodge action as a Bonus Action. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 26,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "friends|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Omens

> Source: AU, p. 27

You gain the following benefits.

##### Cantrip

You learn the Guidance cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Helpful Premonition

When you or a creature you can see within 30 feet of yourself fails a saving throw, you can take a Reaction to roll 1d4 and add the number rolled to the save's total, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "guidance|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Overload

> Source: AU, p. 27

You gain the following benefits.

##### Cantrip

You learn the Fire Bolt cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Power Surge

When you cast an Evocation spell and deal damage with it, you can add your Proficiency Bonus to one damage roll of that spell. Once you use this benefit, you can't do so again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "fire bolt|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Safeguard

> Source: AU, p. 27

You gain the following benefits.

##### Cantrip

You learn the Resistance cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). You can cast the Resistance cantrip as a Bonus Action. You can do so a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

##### Sheltering Aid

When you take the Help action to assist with an ally's ability check, that ally gains a number of Temporary Hit Points equal to your Proficiency Bonus.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          "resistance|xphb#c"
        ]
      }
    }
  ]
}
```

</details>



#### Arcane Undertaker

> Source: AU, p. 27

You gain the following benefits.

##### Cantrip

You learn one Cleric or Wizard cantrip of your choice. The cantrip must be from the Necromancy school. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

##### Knowledge from the Dead

When you make an Intelligence (History) or Wisdom (Medicine) check, you can roll 1d4 and add the number rolled to the ability check.

##### Understanding of Death

When you take the Help action to stabilize a creature with 0 Hit Points, you gain Heroic Inspiration. Once you use this benefit, you can't use it again until you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          {
            "choose": "level=0|class=Cleric;Wizard|school=N",
            "count": 1
          }
        ]
      }
    }
  ]
}
```

</details>



#### Familiar Friend

> Source: AU, p. 27

You gain the following benefits.

##### Faithful Companion

You always have the Find Familiar spell prepared. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). You can cast it once without a spell slot or Material components, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast the spell using any spell slots you have.

##### Fortified Familiar

When you cast the Find Familiar spell, your familiar's Hit Point maximum and current Hit Points are increased by an amount equal to twice your character level.

##### Helpful Friend

When you make an ability check using a skill in which you have proficiency while your familiar is within 5 feet of you, you gain Advantage on the check. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "prepared": {
        "_": {
          "daily": {
            "1": [
              "find familiar|xphb"
            ]
          }
        }
      }
    }
  ]
}
```

</details>



#### Portal Jumper

> Source: AU, p. 27

You gain the following benefits.

##### Otherworldly Resilience

You have Resistance to one of the following damage types: Necrotic, Psychic, or Radiant (choose when you select this feat).

##### Portal Step

You can spend 15 feet of movement to teleport to an unoccupied space you can see within 15 feet of yourself. You can use this benefit a number of times equal to your Proficiency Bonus but only once per turn, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 27,
  "category": "O",
  "resist": [
    {
      "choose": {
        "from": [
          "necrotic",
          "psychic",
          "radiant"
        ]
      }
    }
  ]
}
```

</details>



#### Transmuted Anatomy

> Source: AU, p. 28

You gain the following benefits.

##### Lengthened Stride

Your Speed increases by 5 feet.

##### Resilient Anatomy

You have Advantage on saving throws against effects that would compel you to shape-shift against your will. Additionally, when you fail a Constitution saving throw, you can take a Reaction to roll 1d4 and add the number rolled to the save, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 28,
  "category": "O",
  "traitTags": [
    "Speed"
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "086",
  "page": 26
}
```

</details>

### General Feats

These feats are in the General category.

#### Abjuration Adept

> Source: AU, p. 28

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Abjuration Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Protective Ward

When you cast a spell from the Abjuration school using a spell slot, you or one creature you can see within 30 feet of yourself gains Temporary Hit Points equal to twice the level of spell slot expended.

##### Abjuration Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Shield |
| 2 | Lesser Restoration |
| 3 | Protection from Energy |
| 4 | Banishment |
| 5 | Mass Cure Wounds |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 28,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "shield|xphb"
        ],
        "s2": [
          "lesser restoration|xphb"
        ],
        "s3": [
          "protection from energy|xphb"
        ],
        "s4": [
          "banishment|xphb"
        ],
        "s5": [
          "mass cure wounds|xphb"
        ]
      }
    }
  ],
  "hasFluffImages": true
}
```

</details>



#### Conjuration Adept

> Source: AU, p. 28

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Conjuration Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Persistent Conjuration

While maintaining Concentration on a spell from the Conjuration school, you gain a bonus to Constitution saving throws to maintain this Concentration. This bonus is equal to the ability modifier of the score increased by this feat.

##### Conjuration Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Entangle |
| 2 | Misty Step |
| 3 | Conjure Animals |
| 4 | Dimension Door |
| 5 | Conjure Elemental |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 28,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "entangle|xphb"
        ],
        "s2": [
          "misty step|xphb"
        ],
        "s3": [
          "conjure animals|xphb"
        ],
        "s4": [
          "dimension door|xphb"
        ],
        "s5": [
          "conjure elemental|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Divination Adept

> Source: AU, p. 29

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Divination Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Prescient Intervention

When a creature you can see within 60 feet of yourself makes a D20 Test, you can take a Reaction to give that creature Advantage or Disadvantage (your choice) on that roll.

Once you use this benefit, you can't do so again until you finish a Long Rest. You can also regain use of this feature when you cast a spell from the Divination school using a spell slot.

##### Divination Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Detect Evil and Good |
| 2 | Mind Spike |
| 3 | Clairvoyance |
| 4 | Divination |
| 5 | Scrying |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 29,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "detect evil and good|xphb"
        ],
        "s2": [
          "mind spike|xphb"
        ],
        "s3": [
          "clairvoyance|xphb"
        ],
        "s4": [
          "divination|xphb"
        ],
        "s5": [
          "scrying|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Elemental Familiar

> Source: AU, p. 29

You gain the following benefits.

##### Elemental Energy

You learn how to imbue your familiar with elemental power. When you cast the Find Familiar spell, choose Acid, Cold, Fire, Lightning, or Thunder damage. Your familiar is imbued with this energy until you cast Find Familiar again, granting it the following benefits:

##### Elemental Resistance

Your familiar has Resistance to the chosen damage type.

##### Energy Pulse

As a Bonus Action, you command your familiar to unleash a burst of elemental energy. Your familiar must be within 120 feet of you and take a Reaction to unleash this burst. Each creature in a 5-foot Emanation originating from your familiar makes a Dexterity saving throw (DC 8 plus your spellcasting ability modifier for the Find Familiar spell and your Proficiency Bonus). On a failed save, a creature takes 2d4 damage of the chosen type, and if the creature is Medium or smaller, it has the Prone condition.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 29,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "feat": [
        "familiar friend|au"
      ]
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "str",
          "dex",
          "con",
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "hasFluffImages": true
}
```

</details>



#### Enchantment Adept

> Source: AU, p. 30

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Enchantment Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Subtle Enchantments

When you cast a spell from the Enchantment school using a spell slot, you can cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.

##### Enchantment Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Dissonant Whispers |
| 2 | Enthrall |
| 3 | Hold Person |
| 4 | Dominate Beast |
| 5 | Modify Memory |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 30,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "dissonant whispers|xphb"
        ],
        "s2": [
          "enthrall|xphb"
        ],
        "s3": [
          "hold person|xphb"
        ],
        "s4": [
          "dominate beast|xphb"
        ],
        "s5": [
          "modify memory|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Evocation Adept

> Source: AU, p. 30

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Evocation Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Fueled Evocation

Once per turn when you cast an Evocation spell and deal damage, you can roll up to two of your unexpended Hit Point Dice and add the total rolled to one of the spell's damage rolls. Those Hit Point Dice are then expended.

##### Evocation Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Chromatic Orb |
| 2 | Shatter |
| 3 | Fireball |
| 4 | Vitriolic Sphere |
| 5 | Wall of Force |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 30,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "chromatic orb|xphb"
        ],
        "s2": [
          "shatter|xphb"
        ],
        "s3": [
          "fireball|xphb"
        ],
        "s4": [
          "vitriolic sphere|xphb"
        ],
        "s5": [
          "wall of force|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Illusion Adept

> Source: AU, p. 30

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Illusion Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Masterful Illusions

When you cast a spell from the Illusion school using a spell slot, you can cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell. Additionally, creatures have Disadvantage on Intelligence (Investigation) checks made to discern the true nature of illusions created by your spells.

##### Illusion Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Silent Image |
| 2 | Phantasmal Force |
| 3 | Major Image |
| 4 | Hallucinatory Terrain |
| 5 | Seeming |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 30,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "silent image|xphb"
        ],
        "s2": [
          "phantasmal force|xphb"
        ],
        "s3": [
          "major image|xphb"
        ],
        "s4": [
          "hallucinatory terrain|xphb"
        ],
        "s5": [
          "seeming|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Magic Connoisseur

> Source: AU, p. 31

You gain the following benefits.

##### Additional Spells

Choose a level 1 and a level 2 spell from the same list you selected for the Magic Initiate feat's cantrips. You always have those spells prepared. You can cast each spell once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast those spells using any spell slots you have of the appropriate level. The spellcasting ability for these spells is the same as the spellcasting ability chosen for your Magic Initiate feat's spells.

##### Spell Change

Whenever you gain a new level, you can replace one of the spells you chose for this feat with a different spell of the same level from the chosen spell list.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 31,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "feat": [
        "magic initiate|xphb"
      ]
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "name": "Cleric Spells",
      "ability": "inherit",
      "prepared": {
        "_": {
          "daily": {
            "1e": [
              {
                "choose": "level=1|class=Cleric"
              },
              {
                "choose": "level=2|class=Cleric"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Druid Spells",
      "ability": "inherit",
      "prepared": {
        "_": {
          "daily": {
            "1e": [
              {
                "choose": "level=1|class=Druid"
              },
              {
                "choose": "level=2|class=Druid"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Wizard Spells",
      "ability": "inherit",
      "prepared": {
        "_": {
          "daily": {
            "1e": [
              {
                "choose": "level=1|class=Wizard"
              },
              {
                "choose": "level=2|class=Wizard"
              }
            ]
          }
        }
      }
    }
  ]
}
```

</details>



#### Necromancy Adept

> Source: AU, p. 31

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Necromancy Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Life Manipulation

When you cast a spell from the Necromancy school using a spell slot, you can immediately roll up to two of your unexpended Hit Point Dice. You regain Hit Points equal to the total rolled plus the level of spell slot expended. Those Hit Point Dice are then expended.

##### Necromancy Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Inflict Wounds |
| 2 | Ray of Enfeeblement |
| 3 | Vampiric Touch |
| 4 | Blight |
| 5 | Raise Dead |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 31,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "inflict wounds|xphb"
        ],
        "s2": [
          "ray of enfeeblement|xphb"
        ],
        "s3": [
          "vampiric touch|xphb"
        ],
        "s4": [
          "blight|xphb"
        ],
        "s5": [
          "raise dead|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Otherworldly Familiar

> Source: AU, p. 31

You gain the following benefits.

##### Otherworldly Power

When you cast the Find Familiar spell, you can imbue your familiar with otherworldly might, which lasts until you cast Find Familiar again. While imbued, your familiar gains the following benefits:

##### Energy Resistance

Choose Necrotic, Poison, Psychic, Radiant, or Thunder damage. Your familiar has Resistance to the chosen damage type.

##### Phase Walk

Your familiar can move through other creatures and objects as if they were Difficult Terrain. If your familiar ends its turn inside an object, it is shunted to the last unoccupied space it was in.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 31,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "feat": [
        "familiar friend|au"
      ]
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "str",
          "dex",
          "con",
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ]
}
```

</details>



#### Soothing Familiar

> Source: AU, p. 31

You gain the following benefits.

##### Healing Beacon

Positive energy fills a 5-foot Emanation originating from your familiar as long as it is within 120 feet of you. Whenever an ally in that Emanation rolls a die to determine the number of Hit Points restored to a creature, that ally can treat a roll of 1 or 2 on the die as a 3.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 31,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "feat": [
        "familiar friend|au"
      ]
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "str",
          "dex",
          "con",
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ]
}
```

</details>



#### Spell Resistant

> Source: AU, p. 31

You gain the following benefits.

##### Magical Resilience

You have Resistance to one of the following damage types (choose when you gain this feat): Necrotic, Psychic, Radiant, or Thunder.

##### Magic Resistant

When you would fail a saving throw against a spell or magical effect, you can roll 1d6 and add the number rolled to the save's total, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 31,
  "category": "G",
  "prerequisite": [
    {
      "level": 4
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "dex",
          "con"
        ]
      }
    }
  ],
  "resist": [
    {
      "choose": {
        "from": [
          "necrotic",
          "psychic",
          "radiant",
          "thunder"
        ]
      }
    }
  ],
  "hasFluffImages": true
}
```

</details>



#### Spell Subterfuge

> Source: AU, p. 32

You gain the following benefits.

##### Shrouding Spells

After you cast a spell that has a casting time of an action using a spell slot, you can take both the Dash and Hide actions as a Bonus Action. You can use this benefit a number of times equal to the ability modifier of the score increased by this feat, and you regain all expended uses when you finish a Long Rest.

##### Sneaky Casting

If you have the Hide action's Invisible condition, casting a spell with a Verbal component or making a spell attack doesn't end that condition on you if you end the turn behind Three-Quarters Cover or Total Cover.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 32,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ]
}
```

</details>



#### Transmutation Adept

> Source: AU, p. 32

You gain the following benefits.

##### Additional Spells

Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Transmutation Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

##### Magical Augmentation

On your turn when you cast a spell from the Transmutation school using a spell slot, your Speed increases by a number of feet equal to five times the level of spell slot expended. This increase lasts until the end of the turn.

##### Transmutation Adept Spells

| Spell Slot Level | Spell |
| --- | --- |
| 1 | Jump |
| 2 | Spider Climb |
| 3 | Slow |
| 4 | Polymorph |
| 5 | Animate Objects |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 32,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "prepared": {
        "s1": [
          "jump|xphb"
        ],
        "s2": [
          "spider climb|xphb"
        ],
        "s3": [
          "slow|xphb"
        ],
        "s4": [
          "polymorph|xphb"
        ],
        "s5": [
          "animate objects|xphb"
        ]
      }
    }
  ]
}
```

</details>



#### Warlike Familiar

> Source: AU, p. 33

You gain the following benefits.

##### Battle Familiar

You always have the Battle Familiar spell (see chapter 2) prepared. You can cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Your spellcasting ability for this spell is the one chosen for the Faithful Companion benefit of your Familiar Friend feat.

##### Intercept Attack

When a creature within 5 feet of your familiar is hit by an attack roll, your familiar can take a Reaction to add a bonus to the creature's Armor Class against that attack, potentially causing the attack to miss. The bonus is equal to your Proficiency Bonus.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 33,
  "category": "G",
  "prerequisite": [
    {
      "level": 4,
      "feat": [
        "familiar friend|au"
      ]
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "str",
          "dex",
          "con",
          "int",
          "wis",
          "cha"
        ]
      }
    }
  ],
  "additionalSpells": [
    {
      "ability": "inherit",
      "prepared": {
        "_": {
          "daily": {
            "1": [
              "battle familiar|au"
            ]
          }
        }
      }
    }
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "0a7",
  "page": 28
}
```

</details>

### Fighting Style Feat

This feat is in the Fighting Style category.

#### Arcane Warrior

> Source: AU, p. 33

You learn two Wizard cantrips of your choice. Mage Hand and Ray of Frost are recommended. Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose when you select this feat).

Whenever you gain a level, you can replace one of these cantrips with another Wizard cantrip.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 33,
  "category": "FS",
  "prerequisite": [
    {
      "feature": [
        "Fighting Style"
      ]
    }
  ],
  "additionalSpells": [
    {
      "ability": {
        "choose": [
          "int",
          "wis",
          "cha"
        ]
      },
      "known": {
        "_": [
          {
            "choose": "level=0|class=Wizard",
            "count": 2
          }
        ]
      }
    }
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "0e1",
  "page": 33
}
```

</details>

### Epic Boon Feats

These feats are in the Epic Boon category.

#### Boon of Erupting Spellpower

> Source: AU, p. 33

You gain the following benefits.

##### Spell Overload

When you cast a spell that deals damage using a spell slot, you can cause its magical energy to surge. You can treat any 1 or 2 on a damage die rolled for the spell as a 3, and creatures that took damage from the spell also have the Prone condition. Once you use this benefit, you can't do so again until you roll Initiative or finish a Long Rest or Short Rest.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 33,
  "category": "EB",
  "prerequisite": [
    {
      "level": 19,
      "spellcasting2020": true
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      },
      "max": 30
    }
  ]
}
```

</details>



#### Boon of Magic School Mastery

> Source: AU, p. 33

You gain the following benefits.

##### Mastered School

Choose one of the eight schools of magic: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, or Transmutation. Your choice grants you the following features:

- ###### Rote Casting
  
  Choose a level 1 spell from the chosen school that appears on your class's spell list. You always have that spell prepared and can cast it without a spell slot or spell components.
- ###### Signature Arcanum
  
  Choose a level 7 or lower spell from the chosen school. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

You can also cast these prepared spells using any spell slots you have of the appropriate level.

##### Repeatable

You can take this feat more than once, but you must choose a different school of magic each time.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 33,
  "category": "EB",
  "prerequisite": [
    {
      "level": 19,
      "spellcasting2020": true
    }
  ],
  "repeatable": true,
  "repeatableHidden": true,
  "ability": [
    {
      "choose": {
        "from": [
          "int",
          "wis",
          "cha"
        ]
      },
      "max": 30
    }
  ],
  "additionalSpells": [
    {
      "name": "Abjuration",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=A"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=A"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Conjuration",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=C"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=C"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Divination",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=D"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=D"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Enchantment",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=E"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=E"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Evocation",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=V"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=V"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Illusion",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=I"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=I"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Necromancy",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=N"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=N"
              }
            ]
          }
        }
      }
    },
    {
      "name": "Transmutation",
      "prepared": {
        "_": {
          "will": [
            {
              "choose": "level=1|school=T"
            }
          ],
          "daily": {
            "1": [
              {
                "choose": "level=1;2;3;4;5;6;7|school=T"
              }
            ]
          }
        }
      }
    }
  ]
}
```

</details>



#### Boon of the Iron Mind

> Source: AU, p. 33

You gain the following benefits.

##### Unshakable Focus

When you are maintaining Concentration on an effect, you lose Concentration only if you cast a spell or activate another effect that requires Concentration, if you have the Petrified or Unconscious condition, or if you die.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 33,
  "category": "EB",
  "prerequisite": [
    {
      "level": 19
    }
  ],
  "ability": [
    {
      "choose": {
        "from": [
          "str",
          "dex",
          "con",
          "int",
          "wis",
          "cha"
        ]
      },
      "max": 30
    }
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "0e3",
  "page": 33
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "084",
  "page": 26
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "006",
  "page": 7
}
```

</details>
