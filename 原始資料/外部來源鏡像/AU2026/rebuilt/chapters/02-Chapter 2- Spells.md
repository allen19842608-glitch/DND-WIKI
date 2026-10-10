# Chapter 2: Spells

[A seasoned mage teaches apprentices about illusions.](https://5e.tools/img/book/AU/024-02-001.ch-2-splash.webp)

The following new and revised spells can help players bring a magical world to life. These spells harness great magical power, allowing characters to empower their familiars or detonate their enemies.

The spells are presented in alphabetical order, and the Spells table orders them by level. The table also notes each spell's school of magic and which classes have access to it. (The Artificer is described in Eberron: Forge of the Artificer.) In the Special column, *C* means the spell requires Concentration, *R* means it's a Ritual, and *M* means it requires a specific Material component.

## Spells

| Level | Spell | School | Special | Class |
| --- | --- | --- | --- | --- |
| 2 | Battle Familiar | Conjuration | M | Druid, Warlock, Wizard |
| 2 | Disruptive Tune | Abjuration | C | Bard, Sorcerer, Wizard |
| 2 | Dueling Ground | Abjuration | R, M | Artificer, Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard |
| 2 | Uncertain Footing | Illusion | C | Artificer, Bard, Warlock, Wizard |
| 2 | Wither and Bloom | Necromancy | — | Druid, Sorcerer, Wizard |
| 3 | Catnap | Enchantment | — | Artificer, Bard, Sorcerer, Wizard |
| 3 | Inflict Doubt | Enchantment | C | Bard, Sorcerer, Warlock, Wizard |
| 4 | Distorted Distance | Illusion | C | Artificer, Bard, Warlock, Wizard |
| 4 | Festering Blast | Necromancy | — | Druid, Sorcerer, Warlock, Wizard |
| 4 | Zone of Amicability | Enchantment | — | Bard, Warlock |
| 5 | Enervation | Necromancy | C | Sorcerer, Warlock, Wizard |
| 5 | Grave Ground | Necromancy | C | Cleric, Warlock, Wizard |
| 5 | Mordenkainen's Lucubration | Divination | — | Wizard |
| 5 | Negative Energy Flood | Necromancy | — | Warlock, Wizard |
| 5 | Spirit Lantern | Necromancy | — | Artificer, Cleric, Warlock, Wizard |
| 5 | Summon Plant | Conjuration | C, M | Druid, Ranger |
| 5 | Waves of Exhaustion | Necromancy | C | Sorcerer, Warlock, Wizard |
| 6 | Summon Dinosaur | Conjuration | C, M | Druid |
| 7 | Aura of Evasion | Abjuration | C | Sorcerer, Warlock, Wizard |
| 7 | Fractured Awareness | Divination | C | Bard, Sorcerer, Warlock, Wizard |
| 7 | Power Word Pain | Enchantment | — | Bard, Sorcerer, Warlock, Wizard |
| 7 | Reweave Fate | Divination | — | Bard, Cleric, Warlock, Wizard |
| 7 | Transfix | Enchantment | C | Bard, Warlock, Wizard |
| 8 | Entrancing Mirrors | Illusion | C | Bard, Sorcerer, Warlock, Wizard |
| 8 | Illusory Dragon | Illusion | C | Wizard |
| 8 | Iron Body | Transmutation | C, M | Sorcerer, Warlock, Wizard |
| 8 | Lightning Ring | Evocation | C | Druid, Sorcerer, Warlock, Wizard |
| 8 | Moment of Prescience | Divination | — | Wizard |
| 9 | Detonate | Evocation | — | Sorcerer, Warlock, Wizard |
| 9 | Hindsight | Divination | C, M | Wizard |
| 9 | Invulnerability | Abjuration | C, M | Wizard |
| 9 | Vision of Elapsing Eons | Illusion | — | Bard, Sorcerer, Warlock, Wizard |
| 9 | Wail of the Banshee | Necromancy | — | Sorcerer, Warlock, Wizard |



## Spells

### Aura of Evasion

> Source: AU, p. 35

An aura of alacrity radiates from you in a 30-foot Emanation for the duration. While in the aura, you and your allies have Advantage on Dexterity saving throws. When an affected creature is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, it takes no damage if it succeeds on the save and only half damage if it fails. A creature with the Incapacitated condition doesn't gain any benefit from being in the aura.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 35,
  "level": 7,
  "school": "A",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "emanation",
    "distance": {
      "type": "feet",
      "amount": 30
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "savingThrow": [
    "dexterity"
  ],
  "miscTags": [
    "ADV"
  ],
  "areaTags": [
    "E"
  ]
}
```

</details>



### Battle Familiar

> Source: AU, p. 35

You conjure a familiar imbued with magical might. The familiar appears in an unoccupied space within range; resembles an animal of your choice but is a Celestial, Fey, or Fiend (your choice); and uses the Battle Familiar stat block. When you cast this spell, choose the Brute, Flyer, or Stalker form. The choice determines certain details in the stat block.

#### Combat

The familiar is an ally to you and your allies. It rolls its own Initiative and acts on its own turn.

#### Disappearance of the Familiar

The battle familiar disappears when the spell ends, if it drops to 0 Hit Points, or if you die. When it disappears, it leaves behind in its space anything it was wearing or carrying. If you cast this spell again, you decide whether you summon the familiar that disappeared or a different one.

#### One Familiar at a Time

You can't have more than one familiar at a time. If you cast this spell while you already have a familiar from this spell, that familiar is replaced by the new one.

If you have a familiar from the Find Familiar spell when you cast this spell, you empower your existing familiar rather than conjuring a new one. For the duration, your familiar can attack in addition to taking other actions as normal, and your familiar's game statistics are replaced by the Battle Familiar stat block, but it retains its creature type, alignment, Hit Points, Hit Point Dice, and any features granted by the Find Familiar spell. Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the battle familiar. Battle Familiar ends early if the familiar has no more Temporary Hit Points left, and these Temporary Hit Points vanish if any remain when Battle Familiar ends. Your familiar reverts to its previous form when Battle Familiar ends.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

Use the spell slot's level for the spell's level in the stat block.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 35,
  "level": 2,
  "school": "C",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 10
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "a diamond worth 25+ GP",
      "cost": 2500
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      }
    }
  ],
  "miscTags": [
    "SMN",
    "THP"
  ]
}
```

</details>



### Catnap

> Source: AU, p. 37

You make a calming gesture, and up to three willing creatures of your choice that you can see within range have the Unconscious condition for the spell's duration. The spell ends on a target if it takes damage or another creature takes an action to shake it awake. If a target has the Unconscious condition from this spell for the full duration, that target gains the benefits of finishing a Short Rest, and it can't be affected by this spell again until it finishes a Long Rest.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

You can target one additional willing creature for each spell slot level above 3.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 37,
  "level": 3,
  "school": "E",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 30
    }
  },
  "components": {
    "s": true,
    "m": "a pinch of sand"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 10
      }
    }
  ],
  "conditionInflict": [
    "unconscious"
  ],
  "miscTags": [
    "SCT",
    "SGT"
  ],
  "areaTags": [
    "MT"
  ]
}
```

</details>



### Detonate

> Source: AU, p. 38

You create a magical, explosive seed inside a creature you can see within range. The target makes a Constitution saving throw, taking 10d10 Fire damage on a failed save or half as much damage on a successful one.

An explosion then originates from the target. Each creature in a 60-foot Emanation originating from the target (not including the target) makes a Dexterity saving throw, with Disadvantage if this spell reduced the target to 0 Hit Points. A creature takes 10d10 Fire damage on a failed save or half as much damage on a successful one.

A nonmagical object that isn't being worn or carried also takes the damage if it's in the Emanation, and the object starts burning if it's flammable.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 38,
  "level": 9,
  "school": "V",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 500
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a piece of tinder"
  },
  "duration": [
    {
      "type": "instant"
    }
  ],
  "damageInflict": [
    "fire"
  ],
  "savingThrow": [
    "constitution",
    "dexterity"
  ],
  "miscTags": [
    "BO",
    "OBJ",
    "SGT"
  ],
  "areaTags": [
    "E",
    "ST"
  ],
  "hasFluffImages": true
}
```

</details>



### Disruptive Tune

> Source: AU, p. 38

A distracting melody momentarily fills a 20-foot-radius Sphere centered on a point you choose within range. Each creature in the Sphere makes a Constitution saving throw. On a failed save, a target loses Concentration, and it has Disadvantage on Constitution saving throws to maintain Concentration for the spell's duration.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 38,
  "level": 2,
  "school": "A",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "savingThrow": [
    "constitution"
  ],
  "areaTags": [
    "S"
  ]
}
```

</details>



### Distorted Distance

> Source: AU, p. 38

You create an illusory spatial dilation that fills a 60-foot-radius Sphere centered on a point within range. For each creature you can see in the Sphere, you can choose one of the following effects for it:

- ##### Dizzying Elongation
  
  The creature makes an Intelligence saving throw. On a failed save, the creature takes 2d10 Psychic damage, and the Sphere is Difficult Terrain for it until the end of its turn.
- ##### Shortened Space
  
  The creature's Speed increases by 20 feet until the end of its next turn.
  
  Until the spell ends, whenever a creature enters the Sphere or ends its turn there, you can choose for it to receive one of these effects. A creature can be affected by this spell only once per turn.

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
  "page": 38,
  "level": 4,
  "school": "I",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 10
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "savingThrow": [
    "intelligence"
  ],
  "miscTags": [
    "DFT",
    "SGT"
  ],
  "areaTags": [
    "S"
  ]
}
```

</details>



### Dueling Ground

> Source: AU, p. 38

You create a magical dueling ground bounded by a glowing, rune-scribed circle in a 15-foot-radius Sphere centered on a point on the ground you touch.

As part of creating the dueling ground, you designate two willing creatures within the Sphere as the targets. The spell ends early if a creature other than one of the targets enters the Sphere.

If a target drops to 0 Hit Points while in the dueling ground, the target is Stable and teleports to the nearest unoccupied space outside the dueling ground. If a target is subjected to an effect that would kill it instantly without dealing damage while in the dueling ground, the target doesn't die and instead has 0 Hit Points and the Unconscious condition, is Stable, and teleports to the nearest unoccupied space outside the dueling ground.

When only one target remains in the dueling ground, runes matching those on the ground around the Sphere briefly flash around the remaining target's head like a crown.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

You can target one additional willing creature for each spell slot level above 2.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 38,
  "level": 2,
  "school": "A",
  "time": [
    {
      "number": 10,
      "unit": "minute"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "touch"
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "a silk flag worth 100+ GP",
      "cost": 10000
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      }
    }
  ],
  "meta": {
    "ritual": true
  },
  "conditionInflict": [
    "unconscious"
  ],
  "miscTags": [
    "SCT",
    "TP"
  ],
  "areaTags": [
    "S"
  ],
  "hasFluffImages": true
}
```

</details>



### Enervation

> Source: AU, p. 38

A tendril of inky darkness reaches out from you to drain life from a creature you can see within range.

The target makes a Dexterity saving throw. On a failed save, the target takes 6d8 Necrotic damage. On each of your subsequent turns, you can take a Bonus Action to deal 2d8 Necrotic damage to the target automatically. The spell ends if the target is ever outside the spell's range or it has Total Cover from you.

On a successful save, the target takes half the initial damage only, and the spell ends.

Whenever this spell deals damage to a target, you regain Hit Points equal to half the amount of Necrotic damage dealt.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The initial damage increases by 1d8 for each spell slot level above 5.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 38,
  "level": 5,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "necrotic"
  ],
  "savingThrow": [
    "dexterity"
  ],
  "miscTags": [
    "HL",
    "SGT",
    "UBA"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Entrancing Mirrors

> Source: AU, p. 39

You create dozens of illusory mirrors to confuse up to three creatures of your choice that you can see within range.

Each target makes an Intelligence saving throw. On a failed save, a target takes 7d6 Psychic damage and has the Stunned condition. While the target is Stunned, its Speed is halved. On a successful save, a target takes half as much damage only.

A Stunned target repeats the Intelligence saving throw at the end of each of its turns, ending the spell on itself on a success.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 39,
  "level": 8,
  "school": "I",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 90
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a mirror shard"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "conditionInflict": [
    "stunned"
  ],
  "savingThrow": [
    "intelligence"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "MT"
  ]
}
```

</details>



### Festering Blast

> Source: AU, p. 39

A 60-foot-long, 10-foot-wide Line of miasma blasts from you in a direction you choose. Each creature in the Line must make a Constitution saving throw. On a failed save, a target takes 4d10 Necrotic damage and has the Poisoned condition for the duration.

A creature Poisoned by this spell takes 2d10 Poison damage at the start of each of its turns. At the end of each of its turns, a Poisoned target repeats the save, ending the spell on itself on a success.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The initial damage increases by 1d10 for each spell slot level above 4.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 39,
  "level": 4,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "line",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      }
    }
  ],
  "damageInflict": [
    "necrotic",
    "poison"
  ],
  "conditionInflict": [
    "poisoned"
  ],
  "savingThrow": [
    "constitution"
  ],
  "areaTags": [
    "L"
  ]
}
```

</details>



### Fractured Awareness

> Source: AU, p. 40

You cause a creature to receive conflicting visions of multiple possible futures. Choose a creature you can see within range. The target makes an Intelligence saving throw. On a failed save, the target takes 12d10 Psychic damage and has Disadvantage on D20 Tests for the duration. On a successful save, the target takes half as much damage only, and the spell ends.

At the end of each of its turns, an affected target repeats the save, ending the spell on a success.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 40,
  "level": 7,
  "school": "D",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "savingThrow": [
    "intelligence"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Grave Ground

> Source: AU, p. 40

Skeletal hands burst from an area on the ground within range. The area consists of up to four 10-foot squares, which you arrange as you like. Each square must be contiguous with at least one other square. That area is Difficult Terrain for your enemies.

Any enemy in that area when the skeletal hands appear makes a Strength saving throw. On a failed save, a creature takes 6d6 Necrotic damage, and until the end of its next turn, the creature subtracts 1d6 from all its damage rolls. An enemy also makes this save if it enters the area or ends its turn there. A creature makes this save only once per turn.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The damage increases by 1d6 for each spell slot level above 5.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 40,
  "level": 5,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a handful of grave dirt"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "necrotic"
  ],
  "savingThrow": [
    "strength"
  ],
  "miscTags": [
    "DFT"
  ],
  "areaTags": [
    "Q"
  ]
}
```

</details>



### Hindsight

> Source: AU, p. 40

You peer backward through the fabric of time. You see visions of events that occurred within range throughout the past 10 years, racing by at approximately 1 day per second. Throughout the spell's duration, you can freely slow down, pause, rewind, or fast-forward through these visions.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 40,
  "level": 9,
  "school": "D",
  "time": [
    {
      "number": 10,
      "unit": "minute"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 500
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "a tiny hourglass worth 500+ GP, which the spell consumes",
      "cost": 50000,
      "consume": true
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      },
      "concentration": true
    }
  ]
}
```

</details>



### Illusory Dragon

> Source: AU, p. 40

By gathering threads of shadow material from the Shadowfell, you create a Huge shadowy dragon in an unoccupied space that you can see within range. The illusion lasts for the spell's duration and occupies its space as if it were a creature. The illusion is tangible because of the shadow material used to create it but has Immunity to all damage and conditions.

When the illusion appears, any enemy that can see it makes a Wisdom saving throw. On a failed save, the creature drops whatever it's holding and has the Frightened condition for the duration. If a creature Frightened in this way ends its turn in a space where it doesn't have line of sight to the illusion, the creature repeats the saving throw, ending the condition on itself on a success.

As a Bonus Action, you can move the illusion up to 60 feet. At any point during its movement, you can cause the shadowy dragon to exhale a blast of energy in a 60-foot Cone. Each creature in the Cone makes an Intelligence saving throw, taking 6d6 Acid, Cold, Fire, Lightning, Necrotic, or Poison damage (your choice when you create the dragon) on a failed save or half as much damage on a successful one.

A creature that takes a Study action to examine the dragon can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the creature can see through the image and has Advantage on saving throws to end the Frightened condition it caused and to resist its exhalation.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 40,
  "level": 8,
  "school": "I",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageImmune": [
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder"
  ],
  "damageInflict": [
    "acid",
    "cold",
    "fire",
    "lightning",
    "necrotic",
    "poison"
  ],
  "conditionInflict": [
    "frightened"
  ],
  "savingThrow": [
    "intelligence",
    "wisdom"
  ],
  "abilityCheck": [
    "intelligence"
  ],
  "miscTags": [
    "ADV",
    "SGT",
    "UBA"
  ],
  "areaTags": [
    "N"
  ],
  "hasFluffImages": true
}
```

</details>



### Inflict Doubt

> Source: AU, p. 40

You inflict self-doubt on a creature you can see within range. The target must succeed on a Wisdom saving throw or have Disadvantage on D20 Tests for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 40,
  "level": 3,
  "school": "E",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "savingThrow": [
    "wisdom"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Invulnerability

> Source: AU, p. 41

You have Immunity to all damage until the spell ends.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 41,
  "level": 9,
  "school": "A",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "self"
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "a piece of adamantine worth 500+ GP, which the spell consumes",
      "cost": 50000,
      "consume": true
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageImmune": [
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder"
  ]
}
```

</details>



### Iron Body

> Source: AU, p. 41

One willing creature you touch transforms into living metal. Until the spell ends, the target's Exhaustion level can't increase; the target has Resistance to Bludgeoning, Fire, Piercing, and Slashing damage; and it has Immunity to Poison damage and the Paralyzed, Petrified, and Poisoned conditions. If the target is Paralyzed, Petrified, or Poisoned when you cast the spell, those conditions immediately end for the target.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 41,
  "level": 8,
  "school": "T",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "touch"
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "diamond dust worth 250+ GP, which the spell consumes",
      "cost": 25000,
      "consume": true
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageResist": [
    "bludgeoning",
    "fire",
    "piercing",
    "slashing"
  ],
  "damageImmune": [
    "poison"
  ],
  "conditionImmune": [
    "paralyzed",
    "petrified",
    "poisoned"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Lightning Ring

> Source: AU, p. 41

A ring of crackling electricity fills a 10-foot Emanation originating from you. Whenever the Emanation enters a creature's space and whenever a creature enters the Emanation or ends its turn there, you can force that creature to make a Constitution saving throw. On a failed save, the creature takes 3d6 Lightning damage plus 3d6 Thunder damage, and it has the Deafened condition for 1 minute. On a successful save, the creature takes half as much damage only.

As a Magic action while the spell is active, you can emit a 60-foot-long, 5-foot-wide Line out from you in a direction you choose. Each creature in the Line makes a Dexterity saving throw, taking 6d6 Lightning damage on a failed save or half as much damage on a successful one.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 41,
  "level": 8,
  "school": "V",
  "time": [
    {
      "number": 1,
      "unit": "bonus"
    }
  ],
  "range": {
    "type": "emanation",
    "distance": {
      "type": "feet",
      "amount": 10
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a bit of fur and a glass ring"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 10
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "lightning",
    "thunder"
  ],
  "conditionInflict": [
    "deafened"
  ],
  "savingThrow": [
    "constitution",
    "dexterity"
  ],
  "miscTags": [
    "UA"
  ],
  "areaTags": [
    "E",
    "L"
  ]
}
```

</details>



### Moment of Prescience

> Source: AU, p. 42

You have a powerful sixth sense that guides you at just the right time. Turn the roll of your failed D20 Test into a 20, or turn the roll of the triggering attack roll into a 1.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 42,
  "level": 8,
  "school": "D",
  "time": [
    {
      "number": 1,
      "unit": "reaction",
      "condition": "which you take when you fail a D20 Test or when a creature hits you with an attack roll"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "self"
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "instant"
    }
  ]
}
```

</details>



### Mordenkainen's Lucubration

> Source: AU, p. 42

You recover up to two expended spell slots of level 2 or lower.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The maximum level of spell slots you can recover increases to level 3 (if cast with a level 6-7 spell slot) or level 4 (if cast with a level 8+ spell slot).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 42,
  "level": 5,
  "school": "D",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "self"
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "instant"
    }
  ]
}
```

</details>



### Negative Energy Flood

> Source: AU, p. 42

You send ribbons of negative energy at one creature you can see within range. If the target isn't Undead, it makes a Constitution saving throw, taking 3d10 + 25 Necrotic damage on a failed save or half as much damage on a successful one. A Humanoid killed by this spell rises at the start of your next turn as a Zombie that follows your verbal orders for 24 hours, after which it acts according to its nature.

If the target is Undead, it gains 3d10 Temporary Hit Points.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The damage increases by 1d10 for each spell slot level above 5.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 42,
  "level": 5,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "m": "a broken bone and a square of black silk"
  },
  "duration": [
    {
      "type": "instant"
    }
  ],
  "damageInflict": [
    "necrotic"
  ],
  "savingThrow": [
    "constitution"
  ],
  "miscTags": [
    "SGT",
    "SMN",
    "THP"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Power Word Pain

> Source: AU, p. 42

You speak a word of power that causes waves of intense pain to assail one creature you can see within range. If the target has 100 Hit Points or fewer, it takes 6d8 Force damage and has the Charmed condition for the duration. Otherwise, it takes 6d8 Force damage only.

While the target is Charmed, its Speed can be no more than 10 feet, and it has Disadvantage on D20 Tests except Constitution saving throws. In addition, when the target tries to cast a spell, it must first succeed on a Constitution saving throw, or the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn't expended.

At the end of each of its turns, the Charmed target makes a Constitution saving throw, ending the spell on itself on a successful save.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 42,
  "level": 7,
  "school": "E",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      }
    }
  ],
  "damageInflict": [
    "force"
  ],
  "conditionInflict": [
    "charmed"
  ],
  "savingThrow": [
    "constitution"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Reweave Fate

> Source: AU, p. 42

You untangle a single thread of fate to encourage a different result. The creature that failed the D20 Test can reroll it with Advantage, and the creature must use the new roll. If the D20 Test is successful, the creature gains 6d10 Temporary Hit Points from its strengthened fate.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 42,
  "level": 7,
  "school": "D",
  "time": [
    {
      "number": 1,
      "unit": "reaction",
      "condition": "which you take when a creature you can see within 60 feet of you fails a D20 Test"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "s": true
  },
  "duration": [
    {
      "type": "instant"
    }
  ],
  "miscTags": [
    "ADV",
    "SGT",
    "THP"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Spirit Lantern

> Source: AU, p. 43

You conjure a floating, ghostly black lantern that hovers above you and sheds Dim Light in a 60-foot radius. When an enemy dies within this Dim Light, a fragment of the creature's soul flies into the lantern. The lantern can hold a number of soul fragments equal to your spellcasting ability modifier, and those fragments dissipate when the spell ends.

As a Bonus Action, you can expend a soul fragment to create one of the following effects.

#### Drain Life

The soul fragment darts at a creature of your choice that you can see within 60 feet of yourself. The target makes a Constitution saving throw, taking Necrotic damage equal to 4d8 plus your spellcasting ability modifier on a failed save or half as much damage on a successful one.

#### Repair Undead

The soul fragment flies into an Undead creature of your choice that you can see within 60 feet of yourself. That creature regains Hit Points equal to 4d8 plus your spellcasting ability modifier.

#### Ward Ally

The soul fragment darts around a creature of your choice that you can see within 60 feet of yourself. Other creatures have Disadvantage on attack rolls against the chosen creature until the start of your next turn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 43,
  "level": 5,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "self"
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a black lantern"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 10
      }
    }
  ],
  "damageInflict": [
    "necrotic"
  ],
  "savingThrow": [
    "constitution"
  ],
  "miscTags": [
    "HL",
    "LGT",
    "SGT",
    "UBA"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Summon Dinosaur

> Source: AU, p. 43

You call forth the spirit of a primeval dinosaur. It manifests in an unoccupied space that you can see within range and uses the Dinosaur Spirit stat block. When you cast the spell, choose Ankylosaur, Triceratops, or Tyrannosaur. The creature resembles a dinosaur of the chosen type, which determines certain details in its stat block. The creature disappears when it drops to 0 Hit Points or when the spell ends.

The creature is an ally to you and your allies. In combat, the creature shares your Initiative count, but it takes its turn immediately after yours. It obeys your verbal commands (no action required by you). If you don't issue any, the creature takes the Dodge action and uses its movement to avoid danger.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

Use the spell slot's level for the spell's level in the stat block.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 43,
  "level": 6,
  "school": "C",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 90
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "polished scale worth 600+ GP",
      "cost": 60000
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "miscTags": [
    "SGT",
    "SMN"
  ]
}
```

</details>



### Summon Plant

> Source: AU, p. 44

You call forth the spirit of an animated plant. It manifests in an unoccupied space that you can see within range and uses the Plant Spirit stat block. When you cast the spell, choose Fungus, Tree, or Vine. The creature resembles a plant of the chosen type, which determines certain details in its stat block. The creature disappears when it drops to 0 Hit Points or when the spell ends.

The creature is an ally to you and your allies. In combat, the creature shares your Initiative count, but it takes its turn immediately after yours. It obeys your verbal commands (no action required by you). If you don't issue any, it takes the Dodge action and uses its movement to avoid danger.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

Use the spell slot's level for the spell's level in the stat block.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 44,
  "level": 5,
  "school": "C",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 90
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": {
      "text": "herbs worth 500+ GP",
      "cost": 50000
    }
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "hour",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "miscTags": [
    "SGT",
    "SMN"
  ]
}
```

</details>



### Transfix

> Source: AU, p. 44

For the duration, your appearance becomes otherworldly and alluring. One creature of your choice that you can see within 60 feet of you must succeed on a Charisma saving throw or have the Charmed condition for the duration.

While Charmed, the target has the Incapacitated condition, and if the target is more than 5 feet away from you, it moves on its turn toward you by the most direct route, trying to get within 5 feet of you. If the Charmed creature ends its turn within 5 feet of you, it takes 4d8 Psychic damage.

The target doesn't avoid Opportunity Attacks when moving toward you, but before moving into damaging terrain (such as lava or a pit), the target repeats the save, ending the spell on itself on a success.

Until the spell ends, you can take a Magic action on subsequent turns to target another creature, but you can't target a creature again if it has succeeded on a save against this casting of the spell.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The damage increases by 1d8 for each spell slot level above 7.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 44,
  "level": 7,
  "school": "E",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "self"
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "conditionInflict": [
    "charmed",
    "incapacitated"
  ],
  "savingThrow": [
    "charisma"
  ],
  "miscTags": [
    "SGT",
    "UA"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Uncertain Footing

> Source: AU, p. 44

You create illusory obstacles such as rocks or spikes in an attempt to confuse up to three creatures you can see within range, affecting their ability to move. Each target makes an Intelligence saving throw. On a failed save, a target's Speed is halved, and it can't take the Dash action. A hampered target repeats the save at the end of each of its turns, ending the spell on itself on a success.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 44,
  "level": 2,
  "school": "I",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a distorted lens"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "savingThrow": [
    "intelligence"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "MT"
  ]
}
```

</details>



### Vision of Elapsing Eons

> Source: AU, p. 45

You trick a creature you can see within range into believing it is watching itself and its surroundings crumble away, as if eons were passing in moments. The target must succeed on an Intelligence saving throw or take 10d12 Psychic damage and have the Paralyzed condition for the duration.

While Paralyzed, the target repeats the save at the end of each of its turns. On a failed save, it gains 1 Exhaustion level. On a successful save, the spell ends. The spell ends early if someone within 5 feet of the target takes an action to shake it free from the illusion.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 45,
  "level": 9,
  "school": "I",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 120
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      }
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "conditionInflict": [
    "exhaustion",
    "paralyzed"
  ],
  "savingThrow": [
    "intelligence"
  ],
  "miscTags": [
    "SGT"
  ],
  "areaTags": [
    "ST"
  ]
}
```

</details>



### Wail of the Banshee

> Source: AU, p. 45

You emit a terrible scream that can kill those who hear it. Choose up to ten creatures within range. Each target with 50 Hit Points or fewer dies. Targets with more than 50 Hit Points make a Constitution saving throw. On a failed save, a target takes 12d10 Psychic damage and has the Deafened condition for 1 hour. On a successful save, a target takes half as much damage only. A target is unaffected by the spell if it can't hear you.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 45,
  "level": 9,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true
  },
  "duration": [
    {
      "type": "instant"
    }
  ],
  "damageInflict": [
    "psychic"
  ],
  "conditionInflict": [
    "deafened"
  ],
  "savingThrow": [
    "constitution"
  ],
  "areaTags": [
    "MT"
  ]
}
```

</details>



### Waves of Exhaustion

> Source: AU, p. 45

You evoke a nimbus of flickering gray light around your body. For the duration, you can take a Magic action to emit a wave of gray light in a 60-foot Cone. Creatures in that area must succeed on a Constitution saving throw or gain 1 Exhaustion level. This spell can't increase a creature's Exhaustion level above 4.

Exhaustion levels gained from this spell are removed when the spell ends.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 45,
  "level": 5,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "bonus"
    }
  ],
  "range": {
    "type": "cone",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a piece of dried meat"
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 1
      },
      "concentration": true
    }
  ],
  "conditionInflict": [
    "exhaustion"
  ],
  "savingThrow": [
    "constitution"
  ],
  "miscTags": [
    "UA"
  ],
  "areaTags": [
    "N"
  ]
}
```

</details>



### Wither and Bloom

> Source: AU, p. 45

You invoke both death and life in a 10-foot-radius Sphere centered on a point within range. Each creature of your choice in that area makes a Constitution saving throw, taking 3d6 Necrotic damage on a failed save or half as much damage on a successful one. Nonmagical plants in that area that aren't creatures, such as trees and shrubs, wither.

In addition, one creature of your choice in that area can roll one of its unexpended Hit Point Dice and regain a number of Hit Points equal to the roll plus your spellcasting ability modifier. That die is then expended.

#### At Higher Levels

##### Using a Higher-Level Spell Slot

The damage increases by 1d6 for each spell slot level above 2. The number of Hit Point Dice that can be rolled and expended increases by one for each spell slot level above 2. You add your spellcasting modifier to the number of Hit Points regained by this spell only once, regardless of the number of Hit Point Dice rolled and expended.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 45,
  "level": 2,
  "school": "N",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "point",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "s": true,
    "m": "a withered vine twisted into a loop"
  },
  "duration": [
    {
      "type": "instant"
    }
  ],
  "damageInflict": [
    "necrotic"
  ],
  "savingThrow": [
    "constitution"
  ],
  "miscTags": [
    "HL"
  ],
  "areaTags": [
    "S"
  ]
}
```

</details>



### Zone of Amicability

> Source: AU, p. 45

A magical zone of amicability radiates from you in a 60-foot Emanation for the duration. When you make an ability check to influence a creature in that area, you can treat a d20 roll of 9 or lower as a 10.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 45,
  "level": 4,
  "school": "E",
  "time": [
    {
      "number": 1,
      "unit": "action"
    }
  ],
  "range": {
    "type": "emanation",
    "distance": {
      "type": "feet",
      "amount": 60
    }
  },
  "components": {
    "v": true,
    "s": true
  },
  "duration": [
    {
      "type": "timed",
      "duration": {
        "type": "minute",
        "amount": 10
      }
    }
  ],
  "areaTags": [
    "E"
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "0ef",
  "page": 35
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "0ee",
  "page": 35
}
```

</details>
