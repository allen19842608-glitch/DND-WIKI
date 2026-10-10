# Chapter 5: Magic Items

[A retired adventurer shows his grandchild the artifact he found long ago in a dragon's lair: Queen Ehlissa's Marvelous Nightingale.](https://5e.tools/img/book/AU/058-05-001.ch-5-splash.webp)

This chapter describes magic items particularly suited for settings brimming with arcane power. It also presents rules for magic item evolution, allowing you to create magic items that grow in might as your characters do, and ready-made evolving magic items meant as special rewards.

## Magic Items

The Magic Items table lists the magic items in this section and whether they require Attunement, ordered by item rarity. These items use the magic item rules in the Dungeon Master's Guide. The descriptions that follow are presented in alphabetical order.

### Magic Items

| Rarity | Item | Attunement |
| --- | --- | --- |
| Varies | Necklace of the Beastly Familiar | Yes |
| Common | Conjurer's Canopy | No |
| Common | Dictation Quill | No |
| Common | Elocutionist's Lexicon | No |
| Common | Ensorcelled Missive | No |
| Common | Evergreen Fertilizer | No |
| Common | Homeward Compass | No |
| Common | Lucky Foot | No |
| Common | Spell Component Ring | No |
| Common | Sweeping Broom | No |
| Uncommon | Boon Companions' Bands | No |
| Uncommon | Dispelling Ammunition | No |
| Uncommon | Goading Ammunition | No |
| Uncommon | Magewright's Gloves | Yes |
| Uncommon | Martialist's Quarterstaff | Yes |
| Uncommon | Orb of Divination Detection | Yes |
| Uncommon | Orb of Sorcery | Yes |
| Uncommon | Potion of Dragon's Breath | No |
| Uncommon | Potion of Tirelessness | No |
| Uncommon | Ring of Dedicated Focus | Yes |
| Uncommon | Spell-Slinger's Puppet | Yes |
| Uncommon | Thespian's Playbill | Yes |
| Uncommon | Thief's Thimble | Yes |
| Uncommon | Wand of Freshness | No |
| Rare | Arcane Chatelaine | No |
| Rare | Arcanist's Bestiary | Yes |
| Rare | Bellows of Strangulation | No |
| Rare | Blood Amulet | Yes |
| Rare | Dissuader | Yes |
| Rare | Dream Weaver | Yes |
| Rare | Mage Breaker | No |
| Rare | Mage's Manacle | No |
| Rare | Namer's Needle | No |
| Rare | Prismatic Rune | Yes |
| Rare | Scholar's Anchoring Bangle | Yes |
| Rare | Secret Keeper's Circlet | Yes |
| Rare | Spell Duelist's Trophy | Yes |
| Rare | Wand of Slumber | Yes |
| Rare | Wand of Teeth | No |
| Very Rare | Staff of the Lost | Yes |
| Very Rare | Tramontane Armor | Yes |
| Very Rare | Workshop Wrecker | No |
| Legendary | Diamond Staff | Yes |
| Legendary | Grave Reaper | Yes |
| Legendary | Traveler's Pearl | Yes |
| Artifact | Queen Ehlissa's Marvelous Nightingale | Yes |
| Artifact | Universal Pantograph | No |



The multiverse teems with magic items, each imbued with a speck of Mystra's might. Isn't it grand to be stewards of that power?

— Alustriel

<details><summary>Structured source fields</summary>

```json
{
  "id": "275",
  "page": 115
}
```

</details>

### Arcane Chatelaine

> Source: AU, p. 116

This ornate clasp has six spectral keys attached to it. As a Magic action, you can touch one of the keys to a closed door, window, gate, container, or hatch to cast the Arcane Lock spell on it. Once a key is used, it disappears. When all six keys have disappeared, the chatelaine disappears.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 116,
  "rarity": "rare",
  "wondrous": true,
  "attachedSpells": {
    "limited": {
      "6": [
        "arcane lock|xphb"
      ]
    }
  }
}
```

</details>



### Arcanist's Bestiary

> Source: AU, p. 116

Hundreds of pages of illustrations, tables, and diagrams about a wide variety of monsters fill this magical tome.

#### Charm Monster

While holding the book, you can cast the Charm Monster spell (spell save DC 15) from it. The target has Disadvantage on the saving throw against this spell if it isn't a Humanoid. You can't cast this spell again in this way until the next dawn.

#### Extensive Knowledge

When you become attuned to the book, you gain proficiency in one of the following skills of your choice: Arcana, History, Nature, or Religion. Whenever you finish a Long Rest, you can change your choice. If your Attunement to the book ends, you lose this proficiency.

#### Monster Primer

While carrying the book, whenever you take a Study action to make an Intelligence (Arcana) check to recall information about an Aberration, Construct, Elemental, Fey, or Monstrosity you can see, on a successful check, you learn whether that creature has any Immunities, Resistances, or Vulnerabilities. If the creature has any, you know what they are.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 116,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true,
  "grantsProficiency": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "charm monster|xphb"
      ]
    }
  }
}
```

</details>



### Bellows of Strangulation

> Source: AU, p. 116

This bellows has 6 charges. While you are holding it, you can take a Magic action and use one of three command words to cause one of the following effects:

- ##### First Command Word
  
  You expend 1 charge to cause the bellows to suck the energy from one creature you can see within 60 feet. The creature must succeed on a DC 15 Constitution saving throw or have the Incapacitated condition for 1 minute. The creature repeats the save at the end of each of its turns, ending the effect on itself on a success.
- ##### Second Command Word
  
  You expend 3 charges to cause the bellows to suck the energy from creatures in a 30-foot Cone. Each creature in that area must succeed on a DC 15 Constitution saving throw or have the Incapacitated condition for 1 minute. An affected creature repeats the save at the end of each of its turns, ending the effect on itself on a success.
- ##### Third Command Word
  
  You expend 5 charges to cast the Cloudkill spell (spell DC 17) from the bellows.

<details><summary>Structured source fields</summary>

```json
{
  "style": "list-hang-notitle"
}
```

</details>

#### Regaining Charges

The bellows regains 1d6 + 1 charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the bellows explodes in a harmless burst of wind and is lost forever.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 116,
  "rarity": "rare",
  "wondrous": true,
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d6 + 1}",
  "charges": 6,
  "attachedSpells": {
    "charges": {
      "5": [
        "cloudkill|xphb"
      ]
    }
  }
}
```

</details>



### Blood Amulet

> Source: AU, p. 116

This delicate amulet looks like a diminutive beating heart impaled with spikes. It has 3 charges and regains 1d3 charges daily at dawn.

Whenever you deal damage to a creature, you can expend 1 charge to deal an extra 2d10 Necrotic damage to the target and force it to make a DC 15 Constitution saving throw. On a failed save, the target gains 1 Exhaustion level.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 116,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true,
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d3}",
  "charges": 3,
  "hasFluffImages": true
}
```

</details>



### Boon Companions' Bands

> Source: AU, p. 117

Boon Companions' Bands come in pairs and bear matching engravings. While wearing one of the bands, when you cast a spell or use a feature that forces other creatures in its area of effect to make a saving throw, you can protect the creature wearing the matching band if the creature is in the effect's area. That creature automatically succeeds on its saving throw against the effect, and it takes no damage if it would normally take half damage on a successful save.

Once this property is used by either band, the bands can't be used again until the next dawn. If one of the bands in a pair is destroyed, the other one crumbles to dust.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 117,
  "rarity": "uncommon"
}
```

</details>



### Conjurer's Canopy

> Source: AU, p. 117

You can take a Magic action and use a command word to plunge this magical walking stick into the ground, where it stands straight up and projects a canopy of transparent force in a 20-foot Cube originating from the stick. The canopy lasts for 1 hour or until you end the effect early as a Magic action.

The canopy protects creatures and objects within that area from ordinary weather phenomena such as rain or snow. The atmosphere within the canopy's area is comfortable and dry, regardless of the weather. Creatures, objects, and magical effects can still pass through the canopy as usual.

When the canopy disappears, the stick can't be used again for 1d12 hours.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 117,
  "rarity": "common",
  "wondrous": true,
  "hasFluffImages": true
}
```

</details>



### Diamond Staff

> Source: AU, p. 118

This 6-foot-long scepter is carved from a single enormous crystal, with a perfect transparent globe at its head. This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +3 bonus to attack rolls and damage rolls made with it.

#### Adept

While holding the staff, you have Advantage on Intelligence (Arcana) checks.

#### Dazzling Light

While holding the staff, you can expend 1 charge and use a command word to cause light to shine from the staff. The staff emits Bright Light in a 40-foot radius and Dim Light for an additional 40 feet. The staff stops glowing after 1 minute or when you use a command word to deactivate it.

#### Spells

While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.

| Spell | Charge Cost |
| --- | --- |
| Detect Magic | 0 |
| Light | 0 |
| Identify | 1 |
| Maze | 8 |
| Knock | 2 |
| Tongues (self only) | 0 |
| Legend Lore | 5 |
| True Seeing | 3 |



#### Stunning Hit

When you hit with a melee attack using the staff, you can expend 2 charges, and the target must succeed on a DC 17 Constitution saving throw or have the Stunned condition until the end of your next turn.

#### Regaining Charges

The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff is destroyed.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 118,
  "rarity": "legendary",
  "reqAttune": "by a Sorcerer, Warlock, or Wizard",
  "reqAttuneTags": [
    {
      "class": "sorcerer"
    },
    {
      "class": "warlock"
    },
    {
      "class": "wizard"
    }
  ],
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "bonusWeapon": "+3",
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d6 + 4}",
  "charges": 20,
  "staff": true,
  "light": [
    {
      "bright": 40,
      "dim": 80
    }
  ],
  "attachedSpells": {
    "charges": {
      "0": [
        "detect magic|xphb",
        "light|xphb",
        "tongues|xphb"
      ],
      "1": [
        "identify|xphb"
      ],
      "2": [
        "knock|xphb"
      ],
      "3": [
        "true seeing|xphb"
      ],
      "5": [
        "legend lore|xphb"
      ],
      "8": [
        "maze|xphb"
      ]
    }
  }
}
```

</details>



### Dictation Quill

> Source: AU, p. 118

When you take a Magic action to set this magic quill next to Paper or Parchment and a bottle of Ink and use a command word, the quill writes your next spoken or signed words, in the language you're using, at a rate of 25 words per minute. The quill writes for 1 hour; until it has no Paper, Parchment, or Ink; or until you use another command word to stop it (no action required).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 118,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Dispelling Ammunition

When a target takes damage from this magical piece of ammunition, any ongoing spell of level 3 or lower on the target ends. Once it deals damage to a target, the ammunition is no longer magical.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "type": "A|XPHB"
    },
    {
      "type": "AF|XDMG"
    }
  ],
  "ammo": true,
  "inherits": {
    "namePrefix": "Dispelling ",
    "source": "AU",
    "page": 118,
    "rarity": "uncommon",
    "entries": [
      "When a target takes damage from this magical piece of ammunition, any ongoing spell of level 3 or lower on the target ends. Once it deals damage to a target, the ammunition is no longer magical."
    ]
  }
}
```

</details>



### Dissuader

> Source: AU, p. 118

This staff can be wielded as a magic Quarterstaff that grants a +1 bonus to attack rolls and damage rolls made with it. It also has the following additional properties. Once one of these properties is used, that property can't be used again until the next dawn.

#### Calm Emotions

You can cast the Calm Emotions spell (save DC 15) from the staff.

#### Dissuading Aura

As a Magic action while holding the staff, you can create a 30-foot Emanation of mental unrest originating from you that lasts for 1 minute. Whenever the Emanation enters the space of a creature you can see and whenever a creature you can see enters the Emanation or ends its turn there, you can force that creature to make a DC 15 Wisdom saving throw. On a failed save, the creature has the Frightened condition until the start of its next turn.

#### Repel

When a creature enters a space within 5 feet of you, you can take a Reaction to create a shock wave of force. Each creature of your choice in a 30-foot Emanation originating from you must succeed on a DC 15 Strength saving throw or be pushed up to 30 feet straight away from you.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 118,
  "rarity": "rare",
  "reqAttune": true,
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "bonusWeapon": "+1",
  "staff": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "calm emotions|xphb"
      ]
    }
  }
}
```

</details>



### Dream Weaver

> Source: AU, p. 119

This magic tapestry can be hung on a wall or another suitable vertical surface. The tapestry magically unravels and reweaves itself to illustrate the content and emotions of your most recent dreams.

You gain the following benefits while the tapestry is hung and you are within 30 feet of it.

#### Dream Wisdom

During a Long Rest, you can spend an hour studying the tapestry. At the end of the Long Rest, roll 1d20 and record the number rolled. Once before you finish a Long Rest, you can replace any D20 Test you make with this result. You must choose to do so before you roll the D20 Test.

#### Message Recorder

If you are targeted by the Dream spell, the tapestry records the appearance and name of the spell's caster in its design.

#### Mind Wall

While you have the Unconscious condition, you have Advantage on Intelligence, Wisdom, and Charisma saving throws.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Elocutionist's Lexicon

> Source: AU, p. 119

While holding this magic dictionary, you can take a Magic action and try to recall a specific word. The book automatically opens to the page containing the exact word you're searching for.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Ensorcelled Missive

> Source: AU, p. 119

This item functions as a sheet of Parchment. After writing on it, you can take a Magic action to fold or roll the sheet and seal it while speaking or signing a word or short phrase. If a creature unseals the sheet without using the same word or phrase, the writing on the sheet appears as if it were written in an unknown and unintelligible script.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "common",
  "wondrous": true,
  "hasFluffImages": true
}
```

</details>



### Evergreen Fertilizer

> Source: AU, p. 119

Once sprinkled on the soil around a nonmagical plant, this pungent powder keeps the plant healthy for the next 365 days.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Goading Ammunition

If this piece of magic ammunition hits a creature and deals damage, the target makes a DC 13 Charisma saving throw. On a failed save, the target can't take Reactions until the start of its next turn, as it sputters and rages impotently. Once it hits a target, the ammunition is no longer magical.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "type": "A|XPHB"
    },
    {
      "type": "AF|XDMG"
    }
  ],
  "ammo": true,
  "inherits": {
    "namePrefix": "Goading ",
    "source": "AU",
    "page": 119,
    "rarity": "uncommon",
    "entries": [
      "If this piece of magic ammunition hits a creature and deals damage, the target makes a {@dc 13} Charisma saving throw. On a failed save, the target can't take {@variantrule Reaction|XPHB|Reactions} until the start of its next turn, as it sputters and rages impotently. Once it hits a target, the ammunition is no longer magical."
    ]
  }
}
```

</details>



### Grave Reaper

> Source: AU, p. 119

You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon. When you hit a creature with it, the target takes an extra 2d8 Necrotic damage.

#### Soul Lantern

While holding this weapon, you can cast the Spirit Lantern spell. When you cast the spell using the weapon, the conjured lantern can hold up to five soul fragments, and the spell's save DC is 17.

Once the weapon has been used to cast the spell, it can't be used to cast it again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "baseItem": "sickle|xphb",
  "rarity": "legendary",
  "reqAttune": true,
  "weight": 2,
  "weaponCategory": "simple",
  "property": [
    "L|XPHB"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "dmg1": "1d4",
  "dmgType": "S",
  "bonusWeapon": "+2",
  "attachedSpells": {
    "daily": {
      "1e": [
        "spirit lantern|au"
      ]
    }
  }
}
```

</details>



### Homeward Compass

> Source: AU, p. 119

While holding this small brass compass, you can take a Magic action to orient the compass to your current location. Thereafter, the compass's needle always points toward that location. The compass can be oriented to only one location at a time. As a Magic action, you can end the compass's current orientation. When it isn't oriented to a particular location, or if the compass is on a different plane of existence than the location to which it is oriented, the compass's needle spins aimlessly.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Lucky Foot

> Source: AU, p. 119

When you roll a 1 on a saving throw or ability check, you can use this preserved rabbit foot's magic to reroll the die. You must use the new roll, and the foot disintegrates.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 119,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Mage Breaker

> Source: AU, p. 120

You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.

When you hit a Concentrating creature with an attack roll using this weapon and deal damage, the creature has Disadvantage on the saving throw it makes to maintain Concentration.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "baseItem": "dagger|xphb",
  "rarity": "rare",
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P",
  "bonusWeapon": "+1"
}
```

</details>



### Mage's Manacle

> Source: AU, p. 120

As a Magic action while wearing this bracelet, you can target a Large or smaller creature within 5 feet of yourself that has the Grappled or Incapacitated condition. The target must succeed on a DC 15 Dexterity saving throw or become magically bound to you by a spectral chain and manacle that spring from the bracelet.

While bound in this way, the creature has the Restrained condition. When you move, the creature moves with you.

A creature remains bound for 8 hours or until you release it (no action required). If the manacle takes damage from a Disintegrate spell, it is destroyed; nothing else can break or harm it. Once the manacle has bound a creature, it can't be used again this way until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "rare",
  "wondrous": true
}
```

</details>



### Magewright's Gloves

> Source: AU, p. 120

While you wear these gloves, you work as efficiently as two characters when determining how much time it takes to craft nonmagical items using any of the following tools: Alchemist's Supplies, Brewer's Supplies, Calligrapher's Supplies, Cartographer's Tools, Glassblower's Tools, or Jeweler's Tools.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Martialist's Quarterstaff

> Source: AU, p. 120

This magic Quarterstaff has 4 charges and regains 1d4 expended charges daily at dawn. It has the following additional properties.

#### Searing Smite

You can expend 2 charges to cast the Searing Smite spell (DC 13).

#### Throw

When you take the Attack action, you can expend 1 charge to imbue the staff with magical velocity. Until the end of your next turn, the staff gains the Thrown property, with a normal range of 20 feet and a long range of 60 feet, and immediately after you make a ranged attack with the weapon, it flies back to your hand.

#### Trip

When you make a melee attack with this weapon, you can expend 1 charge to give yourself Advantage on the attack roll. If the attack hits, the target makes a DC 13 Strength saving throw. On a failed save, the target has the Prone condition.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "baseItem": "quarterstaff|xphb",
  "rarity": "uncommon",
  "reqAttune": true,
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d4}",
  "charges": 4,
  "staff": true,
  "attachedSpells": {
    "charges": {
      "2": [
        "searing smite|xphb"
      ]
    }
  }
}
```

</details>



### Namer's Needle

> Source: AU, p. 120

You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.

#### Identify Target

When you hit a creature with an attack roll using this weapon, you can compel the target to reveal its identity. The target makes a DC 15 Wisdom saving throw. On a failed save, the target says or signs its name clearly and emphatically. On a successful save, the target is immune to this effect for the next 24 hours. If the creature can't speak or sign a language, it automatically succeeds on the save.

#### Named Target

When you hit a creature with an attack roll using this weapon, you can say or sign the target's name clearly and emphatically to turn the hit into a Critical Hit. Once this property is used, it can't be used again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "baseItem": "dagger|xphb",
  "rarity": "rare",
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P",
  "bonusWeapon": "+1"
}
```

</details>



### Necklace of the Beastly Familiar

> Source: AU, p. 120

This bejeweled necklace comes with a matching charm that can be worn by your familiar. A variety of these necklaces exist, each set with a different kind of gemstone.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "varies",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>

#### Necklace of the Beastly Familiar (Giant Octopus)

> Source: AU, p. 120

This bejeweled necklace is set with azurite and comes with a matching charm that can be worn by your familiar.

##### Familiar

While wearing this necklace, you can cast the Find Familiar spell from it. Once the necklace has been used to cast this spell, it can't be used to cast it again until the next dawn.

##### Beast Transformation

While your familiar is within 60 feet of you, you can take a Magic action to activate the necklace. Your familiar shape-shifts into a Giant Octopus for 10 minutes.

While your familiar is transformed, its stat block is replaced by the stat block of the Beast form, but it retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. Equipment the familiar is wearing or carrying doesn't change size or shape to match the Beast form, and any equipment that the Beast form can't wear or carry falls to the ground.

Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the transformation ends. The transformation ends early on your familiar if it has no Temporary Hit Points left.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "uncommon",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



#### Necklace of the Beastly Familiar (Giant Scorpion)

> Source: AU, p. 120

This bejeweled necklace is set with chrysoprase and comes with a matching charm that can be worn by your familiar.

##### Familiar

While wearing this necklace, you can cast the Find Familiar spell from it. Once the necklace has been used to cast this spell, it can't be used to cast it again until the next dawn.

##### Beast Transformation

While your familiar is within 60 feet of you, you can take a Magic action to activate the necklace. Your familiar shape-shifts into a Giant Scorpion for 10 minutes.

While your familiar is transformed, its stat block is replaced by the stat block of the Beast form, but it retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. Equipment the familiar is wearing or carrying doesn't change size or shape to match the Beast form, and any equipment that the Beast form can't wear or carry falls to the ground.

Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the transformation ends. The transformation ends early on your familiar if it has no Temporary Hit Points left.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



#### Necklace of the Beastly Familiar (Hippopotamus)

> Source: AU, p. 120

This bejeweled necklace is set with zircon and comes with a matching charm that can be worn by your familiar.

##### Familiar

While wearing this necklace, you can cast the Find Familiar spell from it. Once the necklace has been used to cast this spell, it can't be used to cast it again until the next dawn.

##### Beast Transformation

While your familiar is within 60 feet of you, you can take a Magic action to activate the necklace. Your familiar shape-shifts into a Hippopotamus for 10 minutes.

While your familiar is transformed, its stat block is replaced by the stat block of the Beast form, but it retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. Equipment the familiar is wearing or carrying doesn't change size or shape to match the Beast form, and any equipment that the Beast form can't wear or carry falls to the ground.

Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the transformation ends. The transformation ends early on your familiar if it has no Temporary Hit Points left.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



#### Necklace of the Beastly Familiar (Mammoth)

> Source: AU, p. 120

This bejeweled necklace is set with topaz and comes with a matching charm that can be worn by your familiar.

##### Familiar

While wearing this necklace, you can cast the Find Familiar spell from it. Once the necklace has been used to cast this spell, it can't be used to cast it again until the next dawn.

##### Beast Transformation

While your familiar is within 60 feet of you, you can take a Magic action to activate the necklace. Your familiar shape-shifts into a Mammoth for 10 minutes.

While your familiar is transformed, its stat block is replaced by the stat block of the Beast form, but it retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. Equipment the familiar is wearing or carrying doesn't change size or shape to match the Beast form, and any equipment that the Beast form can't wear or carry falls to the ground.

Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the transformation ends. The transformation ends early on your familiar if it has no Temporary Hit Points left.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "very rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



#### Necklace of the Beastly Familiar (Tyrannosaurus Rex)

> Source: AU, p. 120

This bejeweled necklace is set with fire opal and comes with a matching charm that can be worn by your familiar.

##### Familiar

While wearing this necklace, you can cast the Find Familiar spell from it. Once the necklace has been used to cast this spell, it can't be used to cast it again until the next dawn.

##### Beast Transformation

While your familiar is within 60 feet of you, you can take a Magic action to activate the necklace. Your familiar shape-shifts into a Tyrannosaurus Rex for 10 minutes.

While your familiar is transformed, its stat block is replaced by the stat block of the Beast form, but it retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. Equipment the familiar is wearing or carrying doesn't change size or shape to match the Beast form, and any equipment that the Beast form can't wear or carry falls to the ground.

Your familiar gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the transformation ends. The transformation ends early on your familiar if it has no Temporary Hit Points left.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 120,
  "rarity": "legendary",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "find familiar|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



### Orb of Divination Detection

> Source: AU, p. 121

This glass orb is a useful defense against meddlesome mages and magic-wielding spies.

#### Detect Divination

When you are targeted by a spell from the Divination school, the orb glows bright green for the spell's duration.

#### Spellcasting Focus

This orb can be used as an Arcane Focus.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 121,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true,
  "focus": [
    "Sorcerer",
    "Warlock",
    "Wizard"
  ]
}
```

</details>



### Orb of Sorcery

> Source: AU, p. 121

Ribbons of varicolored light swirl inside this magical glass orb.

#### Sorcerous Reservoir

While holding this orb, you can take a Magic action to regain up to 2 expended Sorcery Points. Once this property is used, it can't be used again until the next dawn.

#### Spellcasting Focus

You can use the orb as a Spellcasting Focus for your Sorcerer spells.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 121,
  "rarity": "uncommon",
  "reqAttune": "by a Sorcerer",
  "reqAttuneTags": [
    {
      "class": "sorcerer"
    }
  ],
  "wondrous": true,
  "focus": [
    "Sorcerer"
  ]
}
```

</details>



### Potion of Dragon's Breath

> Source: AU, p. 121

When you drink this potion, you gain the effect of the Dragon's Breath spell for 1 minute (save DC 13, no Concentration required). The damage type associated with that spell is determined by the color of the potion when the potion was created, as shown in the table below.

Light catches off the glittery liquid inside this potion, which is made from the pulverized scale of a chromatic dragon.

| Color | Damage Type |
| --- | --- |
| Black | Acid |
| Blue | Lightning |
| Green | Poison |
| Red | Fire |
| White | Cold |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 121,
  "rarity": "uncommon",
  "attachedSpells": [
    "dragon's breath|xphb"
  ],
  "miscTags": [
    "CNS"
  ]
}
```

</details>



### Potion of Tirelessness

> Source: AU, p. 121

After you drink this potion, you don't need to sleep, and magic can't put you to sleep. This effect lasts 24 hours. For the duration, you can finish a Long Rest in 4 hours if you spend those hours in a state of quiet focus, during which you retain consciousness.

This pale red potion is as thick as molasses, yet it slides out of the bottle as readily as oil.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 121,
  "rarity": "uncommon",
  "miscTags": [
    "CNS"
  ]
}
```

</details>



### Prismatic Rune

> Source: AU, p. 122

A magical rune is etched on this small stone made of multicolored quartz. When you finish a Long Rest, choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder. The rune is imbued with the chosen damage type until you finish another Long Rest.

#### Charges

The rune has 6 charges and regains 1d6 expended charges daily at dawn. When you cast a spell that deals damage, you can expend 1 charge to change the spell's damage type to the damage type chosen for the rune.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 122,
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d6}",
  "charges": 6
}
```

</details>



### Queen Ehlissa's Marvelous Nightingale

> Source: AU, p. 122

Queen Ehlissa's Marvelous Nightingale is named for its first owner, a queen from the eastern Flanaess in the world of Greyhawk. Its origin is unknown, but one legend holds that it was made to console the queen when a beloved pet songbird met its unfortunate end.

This mechanical songbird has crystal eyes, golden feathers, and a small windup key on its back. As a Magic action, you can cause the bird to spring to life for 10 minutes, during which time it sings a beautiful melody audible within 300 feet, or you can revert the bird to its mechanical form. When the nightingale becomes mechanical again, it can't come to life again for 1 hour.

#### Aura of Truth

While the nightingale sings, the effect of a Zone of Truth spell (save DC 18) fills a 15-foot Emanation originating from the nightingale. While attuned to the nightingale, you know which creatures succeed on or fail the saving throw against this effect.

#### Counterspell

While the nightingale sings, you can take a Reaction to cast Counterspell (save DC 18) in response to that spell's trigger. Once this property is used, it can't be used again until the next dawn.

#### Random Properties

The Artifact has the following random properties (see the "Artifacts" section in the Dungeon Master's Guide):

- 2 minor beneficial properties
- 1 major beneficial property
- 1 minor detrimental property

#### Destroying the Nightingale

The nightingale is destroyed if it is released into a whirlwind in Limbo.

#### Ensemble Casting

The nightingale has 6 charges and regains 1d6 + 1 expended charges daily at dawn. As a Bonus Action while the nightingale is singing and within 60 feet of you, you can expend charges to cast one of the spells on the table below from the nightingale (save DC 18). The table shows the number of charges you must expend to cast the spell.

| Spell | Charge Cost |
| --- | --- |
| Calm Emotions | 1 |
| Compulsion | 3 |
| Delayed Blast Fireball | 6 |
| Detect Evil and Good | 0 |
| Greater Restoration | 4 |
| Prismatic Spray | 6 |
| Slow | 2 |
| Speak with Animals | 0 |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 122,
  "rarity": "artifact",
  "reqAttune": true,
  "wondrous": true,
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d6 + 1}",
  "charges": 6,
  "attachedSpells": {
    "charges": {
      "0": [
        "detect evil and good|xphb",
        "speak with animals|xphb"
      ],
      "1": [
        "calm emotions|xphb"
      ],
      "2": [
        "slow|xphb"
      ],
      "3": [
        "compulsion|xphb"
      ],
      "4": [
        "greater restoration|xphb"
      ],
      "6": [
        "delayed blast fireball|xphb",
        "prismatic spray|xphb"
      ]
    },
    "daily": {
      "1e": [
        "counterspell|xphb"
      ]
    },
    "other": [
      "zone of truth|xphb"
    ]
  }
}
```

</details>



### Ring of Dedicated Focus

> Source: AU, p. 122

The magical spike on the side of this ring allows you to sharpen your focus at a moment's notice. When you fail a Constitution saving throw to maintain Concentration, you can roll up to two of your unexpended Hit Dice and add the total rolled to your save, potentially turning the failure into a success. The rolled Hit Dice are then expended.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 122,
  "rarity": "uncommon",
  "reqAttune": true
}
```

</details>



### Scholar's Anchoring Bangle

> Source: AU, p. 122

This heavy magical bracelet inures your mind against potential distractions. While wearing this bracelet, you gain the following benefits.

#### Deep Knowledge

When you take the Study action and make an Intelligence check using a skill in which you have proficiency, you can treat a d20 roll of 9 or lower as a 10.

#### Single-Minded Focus

When you fail a Constitution saving throw to maintain Concentration, you can take a Reaction to succeed instead. Once you use this property, it can't be used again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 122,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Secret Keeper's Circlet

> Source: AU, p. 122

This circlet allows the wearer to wipe from their memory any knowledge of a specific deed or time in their life, making it useful for those who fear mages plumbing their minds with magic.

While wearing this circlet, you can take a Magic action to specify a trigger such as "after I leave this temple" or "when I cast the Animate Dead spell." For the next 24 hours, if that trigger occurs, the circlet erases your memories of everything from the time you chose the trigger until the trigger occurred. No magic short of a Wish spell can restore your memory of this time. Once you use this property, you can't use it again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 122,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true,
  "hasFluffImages": true
}
```

</details>



### Spell Component Ring

> Source: AU, p. 123

This steel ring has a discreet chamber lined with a mystical inscription. As a Magic action, choose one spell you have prepared that requires a Material component; the required Material component must neither have a cost specified nor be consumed by the spell. You store that spell's Material component in the ring's chamber.

Whenever you cast the chosen spell, you don't need to have a hand free to access its Material component, provided you are wearing the ring. The ring can hold the Material component for one spell at a time.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 123,
  "rarity": "common"
}
```

</details>



### Spell Duelist's Trophy

> Source: AU, p. 123

This withered hand or talon is attached to a leather cord that can be worn like a necklace or bracelet. You gain the following benefits while wearing the trophy.

#### Dispelling Touch

When you hit a creature with a melee spell attack, you can activate the trophy to cast the Dispel Magic spell as part of that attack, targeting the hit creature. Once this property has been used, it can't be used again until the next dawn.

#### Helping Hand

When you cast a spell using a spell slot, you can cast it without any Somatic components.

#### Mage Hand

You can cast the Mage Hand cantrip from the trophy.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 123,
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "wondrous": true,
  "attachedSpells": {
    "will": [
      "mage hand|xphb"
    ],
    "daily": {
      "1e": [
        "dispel magic|xphb"
      ]
    }
  }
}
```

</details>



### Spell-Slinger's Puppet

> Source: AU, p. 123

As a Bonus Action while holding this ventriloquist's doll, you can pull the cord on the doll's back to cause the doll to levitate to an unoccupied space you can see within 30 feet of yourself and hover there. While the doll hovers, you can take a Bonus Action to cause the doll to move up to 30 feet to another unoccupied space you can see within 30 feet of yourself. The doll hovers for 1 minute or until you end the effect as a Bonus Action.

While the doll is within 30 feet of you, you can speak using the doll's mouth rather than your own. This allows you to, for instance, cast a spell with a Verbal component even if you can't speak.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 123,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Staff of the Lost

> Source: AU, p. 123

This staff can be wielded as a magic Quarterstaff that grants a +1 bonus to attack rolls and damage rolls made with it.

The staff has 3 charges. While holding the staff, you can expend 1 charge to cast either Maze (save DC 18) or Teleport from it. When the staff has no more charges remaining, it loses its magic and becomes a nonmagical Quarterstaff.

#### Curse

This staff is cursed. Becoming attuned to it extends the curse to you. As long as you remain cursed, you are unwilling to part with the staff, keeping it on your person at all times.

While attuned to this staff, you never know which way is north, and you have Disadvantage on Wisdom (Survival) checks made to navigate. Additionally, whenever you expend a charge from the staff, roll 1d20. On a 1, 1d4 minotaurs of Baphomet materialize, each appearing in an unoccupied space within 30 feet of you. The minotaurs begin combat with you immediately.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 123,
  "rarity": "very rare",
  "reqAttune": true,
  "curse": true,
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "bonusWeapon": "+1",
  "charges": 3,
  "staff": true,
  "attachedSpells": {
    "charges": {
      "1": [
        "maze|xphb",
        "teleport|xphb"
      ]
    }
  }
}
```

</details>



### Sweeping Broom

> Source: AU, p. 124

As a Magic action, you can use this unassuming broom's command word, choosing a point you can see on the ground within 60 feet of yourself. The broom animates and sweeps dust and detritus from the ground in a 20-foot square centered on the chosen point. It sweeps that area until you take another Magic action to deactivate it.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 124,
  "rarity": "common",
  "wondrous": true
}
```

</details>



### Thespian's Playbill

> Source: AU, p. 124

While holding this magical theater program, whenever you take the Study action and make an Intelligence check, you gain a bonus to the check equal to your Charisma modifier (minimum of +1).

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 124,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Thief's Thimble

> Source: AU, p. 124

This magic thimble aids thieves in foiling traps. While wearing this thimble, if you trigger a trap and take damage, the thimble takes the damage instead.

The thimble has 30 Hit Points. If the thimble is reduced to 0 Hit Points, it breaks, and you take any remaining damage.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 124,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true
}
```

</details>



### Tramontane Armor

You gain a {=bonusAc} bonus to Armor Class while wearing this armor. The armor is enchanted to look like a scholarly or priestly robe.

#### Mountain Walker

While you're wearing this armor, Difficult Terrain composed of heavy snow, ice, rubble, or undergrowth doesn't cost you extra movement.

#### Grasping Tendrils

As a Magic action, you can activate the armor, causing the hems of its sleeves and body to extend into ribbonlike tendrils.

As a Bonus Action while the armor is active, you can force each creature of your choice in a 20-foot Emanation originating from you to make a DC 15 Strength saving throw. On a failed save, a creature has the Grappled condition (escape DC 15) and is pulled up to 20 feet straight toward you.

The armor remains active for 1 minute or until you take another Magic action to deactivate it. Once you activate the armor, it can't be activated again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "type": "LA|XPHB"
    },
    {
      "type": "MA|XPHB"
    }
  ],
  "inherits": {
    "namePrefix": "Tramontane ",
    "source": "AU",
    "page": 124,
    "rarity": "very rare",
    "reqAttune": true,
    "bonusAc": "+1",
    "entries": [
      "You gain a {=bonusAc} bonus to {@variantrule Armor Class|XPHB} while wearing this armor. The armor is enchanted to look like a scholarly or priestly robe.",
      {
        "type": "entries",
        "name": "Mountain Walker",
        "entries": [
          "While you're wearing this armor, {@variantrule Difficult Terrain|XPHB} composed of heavy snow, ice, rubble, or undergrowth doesn't cost you extra movement."
        ]
      },
      {
        "type": "entries",
        "name": "Grasping Tendrils",
        "entries": [
          "As a {@action Magic|XPHB} action, you can activate the armor, causing the hems of its sleeves and body to extend into ribbonlike tendrils.",
          "As a {@variantrule Bonus Action|XPHB} while the armor is active, you can force each creature of your choice in a 20-foot {@variantrule Emanation [Area of Effect]|XPHB|Emanation} originating from you to make a {@dc 15} Strength saving throw. On a failed save, a creature has the {@condition Grappled|XPHB} condition (escape {@dc 15}) and is pulled up to 20 feet straight toward you.",
          "The armor remains active for 1 minute or until you take another {@action Magic|XPHB} action to deactivate it. Once you activate the armor, it can't be activated again until the next dawn."
        ]
      }
    ]
  }
}
```

</details>



### Traveler's Pearl

> Source: AU, p. 124

By using a command word while holding this pearl, you can cast the Teleport spell from it. Once this property is used, it can't be used again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 124,
  "rarity": "legendary",
  "reqAttune": true,
  "wondrous": true,
  "attachedSpells": {
    "daily": {
      "1e": [
        "teleport|xphb"
      ]
    }
  }
}
```

</details>



### Universal Pantograph

> Source: AU, p. 124

This cubical box measures 2 feet on each side. It appears to be made of oak and bound in silver, and its surface is engraved with motifs of marionettes and laughing children.

When a nonmagical item is placed in the box and the lid is closed, a perfect duplicate of the item appears next to the box.

#### Clone

As a Magic action, you can cause the pantograph to grow large enough for a Medium creature to crouch within. You can revert the pantograph to its normal size as a Magic action, harmlessly shunting anything that can't fit inside to the nearest unoccupied space.

When a creature is inside the pantograph, you can close the pantograph's lid and sprinkle the pantograph with diamond dust worth at least 100 GP. If you do, the diamond dust is consumed, and you cast the Clone spell, targeting the creature inside the pantograph. After the spell's casting time is finished, the creature is harmlessly shunted from the pantograph, and the pantograph's lid then can't be opened for 120 days, during which time the duplicate from the spell grows within. Once the clone is finished forming, it is harmlessly shunted from the pantograph, and the pantograph returns to its original size. A clone created by the pantograph doesn't need to be contained within a vessel and endures indefinitely while inert.

#### Destroying the Pantograph

If the pantograph doesn't contain a clone, it is destroyed after being submerged in a bog in the Feywild for 999 years.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 124,
  "rarity": "artifact",
  "wondrous": true,
  "attachedSpells": [
    "clone|xphb"
  ],
  "hasFluffImages": true
}
```

</details>



### Wand of Freshness

> Source: AU, p. 125

This wand has 4 charges and regains 1d4 + 1 expended charges daily at dawn. While holding it, you can expend 1 charge to cast the Purify Food and Drink spell from it.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 125,
  "rarity": "uncommon",
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d4 + 1}",
  "charges": 4,
  "attachedSpells": {
    "charges": {
      "1": [
        "purify food and drink|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



### Wand of Slumber

> Source: AU, p. 125

This wand has 7 charges. While holding it, you can cast one of the spells on the following table from it. The table indicates how many charges you must expend to cast the spell.

#### Regaining Charges

The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into sand and is destroyed.

| Spell | Charge Cost |
| --- | --- |
| Catnap | 3 |
| Sleep (save DC 15) | 1 |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 125,
  "rarity": "rare",
  "reqAttune": true,
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d6 + 1}",
  "charges": 7,
  "attachedSpells": {
    "charges": {
      "1": [
        "sleep|xphb"
      ],
      "3": [
        "catnap|au"
      ]
    }
  }
}
```

</details>



### Wand of Teeth

> Source: AU, p. 125

This wand has 10 charges. While holding it, you can take a Magic action to expend up to 3 charges to spray a wave of sharp, spectral teeth in the direction you point it. Each creature in a 30-foot Cone makes a DC 15 Dexterity saving throw. Roll a number of d8s equal to the number of charges expended. On a failed save, a creature takes Piercing damage equal to the total rolled and has the Poisoned condition until the start of your next turn; on a successful save, a creature takes half as much damage only.

#### Regaining Charges

The wand regains 1d10 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand explodes into harmless splinters and is destroyed.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 125,
  "rarity": "rare",
  "recharge": "dawn",
  "rechargeAmount": "{@dice 1d10}",
  "charges": 10
}
```

</details>



### Workshop Wrecker

> Source: AU, p. 125

When this 3-inch-diameter metal ball is activated as a Magic action, it moves at a rapid speed, bouncing off walls and defying any attempts to capture it. The ball remains active for 1 minute or until you deactivate it by using a command word while within 30 feet of it (no action required). Once the ball is used, it can't be used again until the next dawn.

When you activate the ball and at the beginning of each of your turns while the ball is active, each creature in the area makes a Dexterity saving throw, taking Bludgeoning damage on a failed save. The save DC and amount of damage dealt depend on the approximate size of the area in which the ball is active, as shown on the following table.

A nonmagical object that isn't being worn or carried also takes the damage if it is in the area. In confined areas larger than a 100-foot Cube, the amount of damage caused by the ball is negligible. If the ball is activated in an unconfined area, it flies off in a random direction at a rate of 300 feet per round.

| Area | Save DC | Bludgeoning Damage |
| --- | --- | --- |
| 15-foot Cube | 18 | 6d6 + 5 |
| 30-foot Cube | 17 | 4d6 + 4 |
| 50-foot Cube | 15 | 2d6 + 2 |
| 100-foot Cube | 14 | 1d6 + 1 |



<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 125,
  "rarity": "very rare",
  "wondrous": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "274",
  "page": 115
}
```

</details>

## Evolving Magic Items

Few experiences infuse players with more wonder than their characters finding exciting magic items. Characters often grow fond of magic items that have personal significance, such as items that remind them of a beloved companion or a heroic deed.

As characters grow in power, though, that fondness can turn to frustration. A level 1 character's beloved Uncommon item might no longer be as useful by the time that character reaches level 5. Eventually, the character might have a dilemma: abandon their favorite magic item in favor of one with less personal significance, or keep the favored item, potentially forgoing a mechanically stronger option.

The magic item evolution rules in this section allow you to grant a magic item additional properties and increase its rarity as characters become more powerful. With these tools, you can build narrative significance into your characters' magic items and enable the items to grow in power as the characters do. This section presents several ready-made evolving magic items and rules for evolving certain magic items from the Dungeon Master's Guide or other sources.

### When to Evolve Magic Items

You decide when a magic item evolves. In general, a magic item evolves when a character's power level increases to the next tier of play. Treat this as a guideline, not a rule.

#### Repeated Evolutions

You can evolve a magic item multiple times. Each time you evolve it, the magic item retains its properties from its previous rarity (or rarities) and gains a property from its new rarity.

You can evolve a magic item before or after awarding it to a character. In either case, you can increase the item's rarity as the character gains power until its rarity becomes Legendary.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2db",
  "page": 126
}
```

</details>

#### Crafting Evolution

You might also decide that characters can evolve their magic items using the rules for crafting magic items in the 6. If you allow this, the time required to evolve the item equals the difference between the time required to craft an item of the evolving item's new rarity and the time required to craft an item of its previous rarity. Likewise, the cost required is the difference between the cost to craft an item of the evolving item's new rarity and the cost to craft an item of its previous rarity. So evolving an Uncommon item (which requires 10 days and 200 GP to craft) into a Rare item (which requires 50 days and 2,000 GP to craft) requires 40 days and 1,800 GP in raw materials.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2dc",
  "page": 126
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2da",
  "page": 126
}
```

</details>

### Results of Evolution

This section describes the results of magic item evolution.

#### Name and Appearance

Each item's name changes when it evolves, as noted for that type of evolving magic item. Its appearance also changes as it evolves.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2de",
  "page": 126
}
```

</details>

#### Rarity

When a magic item evolves, its rarity increases to the next highest rarity: from Common to Uncommon, from Rare to Very Rare, and so forth. A Legendary magic item can't evolve.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2df",
  "page": 126
}
```

</details>

#### Attunement

A magic item keeps its Attunement requirement (or lack thereof) as it evolves. If a creature is attuned to a magic item when the item evolves, the creature retains its Attunement to that item.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2e0",
  "page": 126
}
```

</details>

#### Cumulative Abilities

When an evolving magic item evolves, it retains the properties described in its previous rarities and gains the properties described in its new rarity. If an evolving weapon grants a bonus to attack rolls and damage rolls, however, that bonus replaces any similar bonus granted by a lower rarity instead of being added to it. For instance, in "Ready-Made Evolving Magic Items," a Keyholes Dagger's bonus to attack and damage rolls is +1 when Uncommon, +2 when Rare, and +3 when Very Rare.

<details><summary>Structured source fields</summary>

```json
{
  "id": "2e1",
  "page": 126
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2dd",
  "page": 126
}
```

</details>

### Ready-Made Evolving Magic Items

The ready-made evolving magic items presented in this section and listed in the Ready-Made Evolving Magic Items table are special rewards. You might award a Ranger a Blossom Rod, for example, to reinforce the character's connection with nature, gradually increasing the rod's rarity to reward the Ranger for their heroics. Similarly, a Necromancer might receive a Staff of Skulls as a gift if their mentor works with the Covenant of the Grave magical faction (see x).

You can structure a campaign arc around one of these items—use it to point the characters toward adventures related to its narrative, similar to how you might use an Artifact.

#### Ready-Made Evolving Magic Items

| Rarity | Item | Attunement |
| --- | --- | --- |
| Varies | Blossom Rod | Yes |
| Varies | Idol of Good Fortunes | Yes |
| Varies | Keyholes Dagger | Yes |
| Varies | Staff of Skulls | Yes |
| Varies | Wave-Swept Weapon | Yes |



<details><summary>Structured source fields</summary>

```json
{
  "id": "2e2",
  "page": 126
}
```

</details>

### Ready-Made Evolving Item Names

When referring to one of these items, use the word that corresponds with the item's rarity before its name. For example, an Uncommon Blossom Rod is a Budding Blossom Rod, a Rare one is a Flowering Blossom Rod, and a Very Rare one is a Somniferous Blossom Rod.

#### Blossom Rod

> Source: AU, p. 127

This rod is made of intertwined, living plant stems.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "varies",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "will": [
      "druidcraft|xphb"
    ],
    "daily": {
      "1e": [
        "plant growth|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>

##### Budding Blossom Rod

> Source: AU, p. 127

###### Budding

Multicolored leaves decorate the rod's stems, and a few buds cluster near each end.

While you hold the rod, you can cast Druidcraft or Plant Growth (Overgrowth only) from it. Once the rod has been used to cast Plant Growth, it can't be used to cast this spell again until the next dawn.

While you hold the rod, as a Magic action, you can rejuvenate nonmagical plants in a 5-foot Cube you can see within 15 feet of yourself. The rejuvenated plants remain verdant for 1d4 days, after which they grow or wither as normal plants would.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "uncommon",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "will": [
      "druidcraft|xphb"
    ],
    "daily": {
      "1e": [
        "plant growth|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



##### Flowering Blossom Rod

> Source: AU, p. 127

###### Budding

Multicolored leaves decorate the rod's stems, and a few buds cluster near each end.

While you hold the rod, you can cast Druidcraft or Plant Growth (Overgrowth only) from it. Once the rod has been used to cast Plant Growth, it can't be used to cast this spell again until the next dawn.

While you hold the rod, as a Magic action, you can rejuvenate nonmagical plants in a 5-foot Cube you can see within 15 feet of yourself. The rejuvenated plants remain verdant for 1d4 days, after which they grow or wither as normal plants would.

###### Flowering

Both ends of the rod bear colorful, fragrant flowers.

While you hold the rod, you can cast Insect Plague from it, using your spell save DC. When you do so, the insects appear as bumblebees. Once the rod has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "will": [
      "druidcraft|xphb"
    ],
    "daily": {
      "1e": [
        "insect plague|xphb",
        "plant growth|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



##### Somniferous Blossom Rod

> Source: AU, p. 127

###### Budding

Multicolored leaves decorate the rod's stems, and a few buds cluster near each end.

While you hold the rod, you can cast Druidcraft or Plant Growth (Overgrowth only) from it. Once the rod has been used to cast Plant Growth, it can't be used to cast this spell again until the next dawn.

While you hold the rod, as a Magic action, you can rejuvenate nonmagical plants in a 5-foot Cube you can see within 15 feet of yourself. The rejuvenated plants remain verdant for 1d4 days, after which they grow or wither as normal plants would.

###### Flowering

Both ends of the rod bear colorful, fragrant flowers.

While you hold the rod, you can cast Insect Plague from it, using your spell save DC. When you do so, the insects appear as bumblebees. Once the rod has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

###### Somniferous

Robust bursts of flowers grow along the rod's length.

While you hold the rod, you can take a Magic action to expel a puff of sleep-inducing pollen in a 30-foot Emanation originating from you. Creatures of your choice in the Emanation must succeed on a DC 17 Constitution saving throw or have the Unconscious condition for 1 hour. Creatures that don't sleep, such as elves, or that have Immunity to the Exhaustion condition automatically succeed on the save. The effect ends on a target if it takes damage or a creature within 5 feet of it takes an action to shake it awake. Once the rod has produced this effect, it can't do so again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "very rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "will": [
      "druidcraft|xphb"
    ],
    "daily": {
      "1e": [
        "insect plague|xphb",
        "plant growth|xphb"
      ]
    }
  },
  "hasFluffImages": true
}
```

</details>



#### Idol of Good Fortunes

> Source: AU, p. 127

This idol resembles an elephant sitting on its haunches, smiling regally behind its uplifted trunk.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "varies",
  "reqAttune": true,
  "wondrous": true,
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "daily": {
      "1e": [
        "augury|xphb"
      ]
    }
  }
}
```

</details>

##### Blemished Idol of Good Fortunes

> Source: AU, p. 127

###### Blemished

The idol is made of tarnished bronze, with minor dings and dents scattered over its surface.

You can cast the Augury spell from the idol. The idol speaks the omen aloud in response. Once the idol has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "uncommon",
  "reqAttune": true,
  "wondrous": true,
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "daily": {
      "1e": [
        "augury|xphb"
      ]
    }
  }
}
```

</details>



##### Tarnished Idol of Good Fortunes

> Source: AU, p. 127

###### Blemished

The idol is made of tarnished bronze, with minor dings and dents scattered over its surface.

You can cast the Augury spell from the idol. The idol speaks the omen aloud in response. Once the idol has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

###### Tarnished

The idol is made of gold, with a patina of dust settled into its crevices.

While attuned to the idol, you gain a +1 bonus to your Armor Class. Additionally, while holding the idol, you can take a Magic action to touch a nonmagical trade bar or gemstone. The item is then transformed into coinage equivalent to its value. For example, if you take a Magic action to touch a 5-pound silver bar while holding the idol, the bar is transformed into 25 GP worth of coins.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "rare",
  "reqAttune": true,
  "wondrous": true,
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "daily": {
      "1e": [
        "augury|xphb"
      ]
    }
  },
  "bonusAc": "+1"
}
```

</details>



##### Golden Idol of Good Fortunes

> Source: AU, p. 127

###### Blemished

The idol is made of tarnished bronze, with minor dings and dents scattered over its surface.

You can cast the Augury spell from the idol. The idol speaks the omen aloud in response. Once the idol has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

###### Tarnished

The idol is made of gold, with a patina of dust settled into its crevices.

While attuned to the idol, you gain a +1 bonus to your Armor Class. Additionally, while holding the idol, you can take a Magic action to touch a nonmagical trade bar or gemstone. The item is then transformed into coinage equivalent to its value. For example, if you take a Magic action to touch a 5-pound silver bar while holding the idol, the bar is transformed into 25 GP worth of coins.

###### Golden

The idol is made of gleaming gold, and the elephant's eyes are set with shining rubies.

While holding the idol, you can cast Globe of Invulnerability from it. Once the idol has been used to cast this spell, it can't be used to cast this spell again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 127,
  "rarity": "very rare",
  "reqAttune": true,
  "wondrous": true,
  "property": [
    "Evo|AU"
  ],
  "attachedSpells": {
    "daily": {
      "1e": [
        "augury|xphb",
        "globe of invulnerability|xphb"
      ]
    }
  },
  "bonusAc": "+1"
}
```

</details>



#### Keyholes Dagger

> Source: AU, p. 128

The hilt of this magic weapon is adorned with ornate, decorative keyholes outlined in golden filigree.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "dagger|xphb",
  "rarity": "varies",
  "reqAttune": true,
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P"
}
```

</details>

##### Three Keyholes Dagger

> Source: AU, p. 128

###### Three

Three ornamental keyholes adorn the weapon's hilt.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. When you take the Attack action, you can transform this weapon into a Handaxe or Mace. It remains transformed in this way until the start of your next turn, at which point it reverts back to its Dagger form. Regardless of the weapon's form, you can use your choice of your Strength or Dexterity modifier for the attack and damage rolls; you must use the same modifier for both rolls.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "dagger|xphb",
  "rarity": "uncommon",
  "reqAttune": true,
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P",
  "bonusWeapon": "+1"
}
```

</details>



##### Ten Keyholes Dagger

> Source: AU, p. 128

###### Three

Three ornamental keyholes adorn the weapon's hilt.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. When you take the Attack action, you can transform this weapon into a Handaxe or Mace. It remains transformed in this way until the start of your next turn, at which point it reverts back to its Dagger form. Regardless of the weapon's form, you can use your choice of your Strength or Dexterity modifier for the attack and damage rolls; you must use the same modifier for both rolls.

###### Ten

Ten ornamental keyholes adorn the weapon's hilt. Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. Additionally, when you transform the weapon, you can now transform it into any Simple Melee weapon.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "dagger|xphb",
  "rarity": "rare",
  "reqAttune": true,
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P",
  "bonusWeapon": "+2"
}
```

</details>



##### Many Keyholes Dagger

> Source: AU, p. 128

###### Three

Three ornamental keyholes adorn the weapon's hilt.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. When you take the Attack action, you can transform this weapon into a Handaxe or Mace. It remains transformed in this way until the start of your next turn, at which point it reverts back to its Dagger form. Regardless of the weapon's form, you can use your choice of your Strength or Dexterity modifier for the attack and damage rolls; you must use the same modifier for both rolls.

###### Ten

Ten ornamental keyholes adorn the weapon's hilt. Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. Additionally, when you transform the weapon, you can now transform it into any Simple Melee weapon.

###### Many

Overlapping ornamental keyholes adorn the weapon's hilt in a dizzying pattern. Your bonus to attack rolls and damage rolls made with this magic weapon increases to +3. When you transform the weapon, you can now also transform it into a Battleaxe, Longsword, Rapier, Scimitar, or Warhammer.

Additionally, when you miss with an attack roll using this weapon, you can reroll the attack, potentially turning the miss into a hit. You must use the second roll. Once used, this property can't be used again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "dagger|xphb",
  "rarity": "very rare",
  "reqAttune": true,
  "weight": 1,
  "weaponCategory": "simple",
  "property": [
    "F|XPHB",
    "L|XPHB",
    "T|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Nick|XPHB"
  ],
  "range": "20/60",
  "dmg1": "1d4",
  "dmgType": "P",
  "bonusWeapon": "+3"
}
```

</details>



#### Staff of Skulls

> Source: AU, p. 128

This staff is made of polished, interlocking bones. Runes are carved along its length.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "rarity": "varies",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "staff": true,
  "attachedSpells": {
    "will": [
      "chill touch|xphb"
    ]
  },
  "hasFluffImages": true
}
```

</details>

##### Ominous Staff of Skulls

> Source: AU, p. 128

###### Ominous

A skull adorns the top of the staff.

While you hold the staff, you can cast Chill Touch from it, using your spell attack bonus. Additionally, you have Advantage on Charisma (Intimidation) checks made while holding the staff, and the staff's eye sockets glow a disquieting green, shedding Dim Light in a 5-foot radius.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "quarterstaff|xphb",
  "rarity": "uncommon",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "staff": true,
  "light": [
    {
      "dim": 5
    }
  ],
  "attachedSpells": {
    "will": [
      "chill touch|xphb"
    ]
  },
  "hasFluffImages": true
}
```

</details>



##### Chattering Staff of Skulls

> Source: AU, p. 128

###### Ominous

A skull adorns the top of the staff.

While you hold the staff, you can cast Chill Touch from it, using your spell attack bonus. Additionally, you have Advantage on Charisma (Intimidation) checks made while holding the staff, and the staff's eye sockets glow a disquieting green, shedding Dim Light in a 5-foot radius.

###### Chattering

Several skulls fused together adorn the top of the staff.

When a creature you can see within 30 feet of you makes an attack roll, you can take a Reaction to impose Disadvantage on that roll, as the skulls' eyes glow green and their teeth chatter unnervingly.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "quarterstaff|xphb",
  "rarity": "rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "staff": true,
  "light": [
    {
      "dim": 5
    }
  ],
  "attachedSpells": {
    "will": [
      "chill touch|xphb"
    ]
  },
  "hasFluffImages": true
}
```

</details>



##### Pulverizing Staff of Skulls

> Source: AU, p. 128

###### Ominous

A skull adorns the top of the staff.

While you hold the staff, you can cast Chill Touch from it, using your spell attack bonus. Additionally, you have Advantage on Charisma (Intimidation) checks made while holding the staff, and the staff's eye sockets glow a disquieting green, shedding Dim Light in a 5-foot radius.

###### Chattering

Several skulls fused together adorn the top of the staff.

When a creature you can see within 30 feet of you makes an attack roll, you can take a Reaction to impose Disadvantage on that roll, as the skulls' eyes glow green and their teeth chatter unnervingly.

###### Pulverizing

The entire staff is made of fused skulls.

While you hold the staff, you can take a Magic action to point the staff at a Humanoid you can see. That creature makes a DC 17 Constitution saving throw. On a failed save, the creature takes 10d8 Necrotic damage and has the Prone condition as it's crushed from the inside. On a successful save, the creature takes half as much damage only. Once used, this property can't be used again until the next dawn.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 128,
  "baseItem": "quarterstaff|xphb",
  "rarity": "very rare",
  "reqAttune": "by a Spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 4,
  "weaponCategory": "simple",
  "property": [
    "V|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Topple|XPHB"
  ],
  "dmg1": "1d6",
  "dmgType": "B",
  "dmg2": "1d8",
  "staff": true,
  "light": [
    {
      "dim": 5
    }
  ],
  "attachedSpells": {
    "will": [
      "chill touch|xphb"
    ]
  },
  "hasFluffImages": true
}
```

</details>



#### Wave-Swept Weapon

> Source: AU, p. 129

This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 129,
  "rarity": "varies",
  "reqAttune": true,
  "property": [
    "Evo|AU"
  ],
  "hasFluffImages": true
}
```

</details>

##### Barnacled Wave-Swept Weapon

This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.

###### Barnacled

Barnacles dot this blade's guard and the flat sides of its etched blade.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a Magic action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    },
    {
      "name": "Longsword",
      "source": "XPHB"
    },
    {
      "name": "Rapier",
      "source": "XPHB"
    },
    {
      "name": "Scimitar",
      "source": "XPHB"
    },
    {
      "name": "Shortsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "namePrefix": "Barnacled Wave-Swept ",
    "source": "AU",
    "page": 129,
    "rarity": "uncommon",
    "reqAttune": true,
    "propertyAdd": [
      "Evo|AU"
    ],
    "bonusWeapon": "+1",
    "entries": [
      "This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.",
      {
        "type": "entries",
        "name": "Barnacled",
        "entries": [
          "Barnacles dot this blade's guard and the flat sides of its etched blade.",
          "You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a {@action Magic|XPHB} action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance."
        ]
      }
    ]
  },
  "hasFluffImages": true
}
```

</details>



##### Aquatic Wave-Swept Weapon

This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.

###### Barnacled

Barnacles dot this blade's guard and the flat sides of its etched blade.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a Magic action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance.

###### Aquatic

The wavelike etchings on this weapon's blade glow with light, shedding Bright Light in a 5-foot radius and Dim Light for an additional 5 feet.

Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. While you hold the weapon, you can breathe underwater, and you have a Swim Speed of 30 feet.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    },
    {
      "name": "Longsword",
      "source": "XPHB"
    },
    {
      "name": "Rapier",
      "source": "XPHB"
    },
    {
      "name": "Scimitar",
      "source": "XPHB"
    },
    {
      "name": "Shortsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "namePrefix": "Aquatic Wave-Swept ",
    "source": "AU",
    "page": 129,
    "rarity": "rare",
    "reqAttune": true,
    "propertyAdd": [
      "Evo|AU"
    ],
    "bonusWeapon": "+2",
    "modifySpeed": {
      "static": {
        "swim": 30
      }
    },
    "entries": [
      "This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.",
      {
        "type": "entries",
        "name": "Barnacled",
        "entries": [
          "Barnacles dot this blade's guard and the flat sides of its etched blade.",
          "You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a {@action Magic|XPHB} action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance."
        ]
      },
      {
        "type": "entries",
        "name": "Aquatic",
        "entries": [
          "The wavelike etchings on this weapon's blade glow with light, shedding {@variantrule Bright Light|XPHB} in a 5-foot radius and {@variantrule Dim Light|XPHB} for an additional 5 feet.",
          "Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. While you hold the weapon, you can breathe underwater, and you have a {@variantrule Swim Speed|XPHB} of 30 feet."
        ]
      }
    ],
    "light": [
      {
        "bright": 5,
        "dim": 10
      }
    ]
  },
  "hasFluffImages": true
}
```

</details>



##### Ascendant Wave-Swept Weapon

This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.

###### Barnacled

Barnacles dot this blade's guard and the flat sides of its etched blade.

You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a Magic action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance.

###### Aquatic

The wavelike etchings on this weapon's blade glow with light, shedding Bright Light in a 5-foot radius and Dim Light for an additional 5 feet.

Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. While you hold the weapon, you can breathe underwater, and you have a Swim Speed of 30 feet.

###### Ascendant

The sea monsters embroidered on this weapon's hilt are studded with chips of colorful gemstones.

Your bonus to attack rolls and damage rolls made with this magic weapon increases to +3. While you hold this weapon, you have a Fly Speed of 30 feet; when you use this Fly Speed, a salty sea breeze carries you through the air.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    },
    {
      "name": "Longsword",
      "source": "XPHB"
    },
    {
      "name": "Rapier",
      "source": "XPHB"
    },
    {
      "name": "Scimitar",
      "source": "XPHB"
    },
    {
      "name": "Shortsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "namePrefix": "Ascendant Wave-Swept ",
    "source": "AU",
    "page": 129,
    "rarity": "very rare",
    "reqAttune": true,
    "propertyAdd": [
      "Evo|AU"
    ],
    "bonusWeapon": "+3",
    "modifySpeed": {
      "static": {
        "fly": 30,
        "swim": 30
      }
    },
    "entries": [
      "This weapon is covered in oceanic motifs, from wavelike etchings on its blade to stylized sea monsters embroidered onto its leather hilt.",
      {
        "type": "entries",
        "name": "Barnacled",
        "entries": [
          "Barnacles dot this blade's guard and the flat sides of its etched blade.",
          "You have a +1 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can take a {@action Magic|XPHB} action to touch up to a gallon of liquid and infuse it with brine, turning fresh water into saltwater, for instance."
        ]
      },
      {
        "type": "entries",
        "name": "Aquatic",
        "entries": [
          "The wavelike etchings on this weapon's blade glow with light, shedding {@variantrule Bright Light|XPHB} in a 5-foot radius and {@variantrule Dim Light|XPHB} for an additional 5 feet.",
          "Your bonus to attack rolls and damage rolls made with this magic weapon increases to +2. While you hold the weapon, you can breathe underwater, and you have a {@variantrule Swim Speed|XPHB} of 30 feet."
        ]
      },
      {
        "type": "entries",
        "name": "Ascendant",
        "entries": [
          "The sea monsters embroidered on this weapon's hilt are studded with chips of colorful gemstones.",
          "Your bonus to attack rolls and damage rolls made with this magic weapon increases to +3. While you hold this weapon, you have a {@variantrule Fly Speed|XPHB} of 30 feet; when you use this {@variantrule Fly Speed|XPHB}, a salty sea breeze carries you through the air."
        ]
      }
    ],
    "light": [
      {
        "bright": 5,
        "dim": 10
      }
    ]
  },
  "hasFluffImages": true
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "2e3",
  "page": 127
}
```

</details>

### Custom Evolving Magic Items

You can use magic items from the *Dungeon Master's Guide* as the basis for evolving magic items.

This section presents two methods for creating your own evolving magic items: simple evolution and complex evolution.

#### Simple Evolution

If a character has one of the magic items in the Simple Magic Item Evolution table, you can evolve that item as shown on the table. For example, a +1 Longsword that evolves becomes a +2 Longsword, and if it evolves again, it becomes a +3 Longsword.

[An Arrow-Catching Shield That Has Evolved into a Regal Arrow-Catching Shield](https://5e.tools/img/book/AU/069-05-012.regal-arrow-catching-shield.webp)

##### Simple Magic Item Evolution

| Item | Evolved Item |
| --- | --- |
| +1 Armor | +2 Armor |
| +2 Armor | +3 Armor |
| +1 Shield | +2 Shield |
| +2 Shield | +3 Shield |
| Rod of the Pact Keeper (Uncommon) | Rod of the Pact Keeper (Rare) |
| Rod of the Pact Keeper (Rare) | Rod of the Pact Keeper (Very Rare) |
| +1 Wand of the War Mage | +2 Wand of the War Mage |
| +2 Wand of the War Mage | +3 Wand of the War Mage |
| +1 Weapon | +2 Weapon |
| +2 Weapon | +3 Weapon |



<details><summary>Structured source fields</summary>

```json
{
  "id": "2f9",
  "page": 130
}
```

</details>

#### Complex Evolution

Some magic items can grow in strength beyond increasing the bonuses they grant. By granting a magic item new and more powerful magical properties, you can create an evolving magic item that grows in exciting ways.

Using the rules in this section, you can evolve eligible magic items from the Dungeon Master's Guide. At your discretion, items from other sources might be eligible for evolution using these rules.

The following magic items are eligible for complex evolution:

- ###### Certain Rods and Wands:
  
  Any Rod of the Pact Keeper or Wand of the War Mage
- ###### Certain Other Uncommon or Rarer Magic Items:
  
  Any Armor, Staff, or Weapon that requires Attunement, that isn't cursed, and whose rarity is at most Very Rare

<details><summary>Structured source fields</summary>

```json
{
  "page": 130,
  "style": "list-hang-notitle"
}
```

</details>

##### Complex Evolution Steps

To evolve an item with this system, use the following steps in conjunction with the instructions from "When to Evolve Magic Items" earlier in this chapter:

- ###### 1: Choose a Magic Item to Evolve
  
  Pick the eligible magic item you plan to evolve, and note its current rarity.
- ###### 2: Determine the Item's New Rarity
  
  The item's new rarity is the next highest rarity.
- ###### 3: Roll on or Choose from the New Rarity's Table
  
  Use the 5 for the item's new rarity to select a new property, noting any details such as limited usage. (If the magic item grants a bonus to Armor Class, attack and damage rolls, saving throws, or spell save DCs, don't increase the bonus as part of evolving the item with this system. For example, if you evolve a +1 Wand of the War Mage and give it a new property from this system, the item's bonus remains +1.)
- ###### 4: Determine the Item's New Name and Physical Characteristics
  
  Change the evolved item's name to represent its newfound power. If you like, you can give the item a new, more dramatic name. Either way, preface its name with the name of the property it just gained. For example, if you evolve a Sword of Sharpness to be Legendary and grant it the Prismatic property, it would be called a Prismatic Sword of Sharpness.
  
  Evolution also causes physical changes; examples include the appearance of magical runes or additional filigree.

<details><summary>Structured source fields</summary>

```json
{
  "page": 130,
  "style": "list-hang-notitle"
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2fb",
  "page": 130
}
```

</details>

##### Magic Item Property Tables

Roll on or choose from the tables that follow when determining new properties for complex evolving magic items.

###### Rare Magic Item Properties

| 1d12 | Property |
| --- | --- |
| 1 | Amicable. When you fail an ability check made to influence a creature while holding or wearing this item, you can roll 1d6 and add the number rolled to the check, potentially turning the failure into a success. This property can be used three times, and the item regains expended uses of this property daily at dawn. |
| 2 | Conversational. While holding or wearing this item, you can cast Tongues from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 3 | Crusading. While holding or wearing this item, you can cast Crusader's Mantle from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 4 | Displacing. While holding or wearing this item, you can cast Blur from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 5 | Frightening. While holding or wearing this item, you can cast Fear (save DC 15) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 6 | Fulminating. While holding or wearing this item, you can cast Lightning Bolt (save DC 15) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 7 | Immolating. While holding or wearing this item, you can cast Fireball (save DC 15) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 8 | Quickening. As a Bonus Action while holding or wearing this item, you can infuse yourself with magical velocity for 1 minute or until your Concentration ends. While you are infused, your Speed is doubled, and Opportunity Attacks against you are made with Disadvantage. Once this property has been used, it can't be used again until the next dawn. |
| 9 | Restorative. While holding or wearing this item, you can take a Magic action to cast both Cure Wounds and Lesser Restoration, targeting the same creature. Once this property has been used, it can't be used again until the next dawn. |
| 10 | Skulking. While holding or wearing this item, you can cast Pass Without A Trace from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 11 | Studious. When you fail an ability check made as part of the Study action while holding or wearing this item, you can roll 1d6 and add the number rolled to the check, potentially turning the failure into a success. This property can be used three times, and the item regains expended uses of this property daily at dawn. |
| 12 | Vigilant. While holding or wearing this item, you have Advantage on Initiative rolls and Wisdom (Perception) checks. |



Some magic items are far more special than the wondrous trinkets you would find in a shop. Your parent's sword or your mentor's wand—hold these close and shut your eyes. That's when you'll feel their power.

— Alustriel

<details><summary>Structured source fields</summary>

```json
{
  "id": "2fd",
  "page": 131
}
```

</details>

###### Very Rare Magic Item Properties

| 1d12 | Property |
| --- | --- |
| 1 | Chilling. While holding or wearing this item, you can cast Cone of Cold (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 2 | Deceptive. While holding or wearing this item, you can cast Mislead (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 3 | Far-Seeing. While holding or wearing this item, you can cast Scrying (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 4 | Fortunate. While attuned to this magic item, you can reroll one failed D20 Test, and you must used the second roll. This property can be used twice, and the item regains expended uses of this property daily at dawn. |
| 5 | Lunar. While holding or wearing this item, you can cast Fount of Moonlight or Moonbeam (save DC 17) from it. Once the item has been used to cast a spell, it can't be used to cast that spell again until the next dawn. |
| 6 | Paralyzing. While holding or wearing this item, you can cast Hold Monster (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 7 | Psionic. While holding or wearing this item, you have telepathy with a range of 30 feet, and you can cast Synaptic Static (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 8 | Regal. While holding or wearing this item, you can cast Yolande's Regal Presence (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 9 | Resilient. While holding or wearing this item, you can cast Otiluke's Resilient Sphere (save DC 17) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 10 | Resistant. While attuned to this item, you have Resistance to one of the following damage types (DM's choice): Acid, Cold, Fire, Lightning, Necrotic, Poison, Psychic, Radiant, or Thunder. |
| 11 | Traversing. While holding or wearing this item, you can cast Dimension Door or Freedom of Movement from it. Once the item has been used to cast a spell, it can't be used to cast that spell again until the next dawn. |
| 12 | Withering. While holding or wearing this item, you can cast Blight or Vampiric Touch (save DC 17, +9 to hit with spell attacks) from it. Once the item has been used to cast a spell, it can't be used to cast that spell again until the next dawn. |



###### Legendary Magic Item Properties

| 1d10 | Property |
| --- | --- |
| 1 | All-Seeing. While attuned to this item, you have Truesight with a range of 30 feet. |
| 2 | Empowering. While attuned to this item, one of your ability scores (DM's choice) increases by 2, to a maximum of 24. |
| 3 | Gravitational. While holding or wearing this item, you can cast Reverse Gravity (save DC 18) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 4 | Heliacal. While holding or wearing this item, you can cast Sunburst (save DC 18) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 5 | Prismatic. While holding or wearing this item, you can cast Prismatic Spray (save DC 18) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 6 | Spellguarding. While holding or wearing this item, you have Advantage on saving throws against spells and other magical effects. |
| 7 | Stupefying. While holding or wearing this item, you can cast Power Word Stun (save DC 18) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 8 | Subjugating. While holding or wearing this item, you can cast Dominate Monster (save DC 18) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 9 | Tranquil. While holding or wearing this item, you can cast Mind Blank (targeting yourself only) from it. Once the item has been used to cast this spell, this property can't be used again until the next dawn. |
| 10 | Vanishing. While holding or wearing this item, you can take a Magic action to give yourself the Invisible condition for 1 hour or until you end it (no action required). Once this property has been used, it can't be used again until the next dawn. |



<details><summary>Structured source fields</summary>

```json
{
  "id": "2fc",
  "page": 130
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2fa",
  "page": 130
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2f8",
  "page": 129
}
```

</details>

### Complex Evolution Examples

The following examples show how to apply the rules for complex evolution to magic items from the Dungeon Master's Guide. These examples give fantastical new names to the base items and provide story details to show how you can use these elements to enhance your game.

When referring to one of these items, use the word that corresponds with the item's rarity before its name. For example, a Rare Blade of the Guardian is a Studious Blade of the Guardian, a Very Rare one is a Resistant Blade of the Guardian, and a Legendary one is an All-Seeing Blade of the Guardian.

#### Blade of the Guardian

> Source: AU, p. 132

In this example, a Paladin finds a treasured Weapon of Warning (Greatsword), an Uncommon magic item, early in her adventuring career. Each time the weapon evolves, the shield patterns etched into its blade become more intricate.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 132,
  "baseItem": "greatsword|xphb",
  "rarity": "varies",
  "reqAttune": true,
  "weight": 6,
  "weaponCategory": "martial",
  "property": [
    "H|XPHB",
    "2H|XPHB",
    "Evo|AU"
  ],
  "mastery": [
    "Graze|XPHB"
  ],
  "dmg1": "2d6",
  "dmgType": "S"
}
```

</details>

##### Studious Blade of the Guardian

> Source: AU

As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.

###### Alarm

The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep.

###### Supernatural Readiness

Each subject has Advantage on its Initiative rolls.

###### Studious

The DM decides the weapon evolves to a Rare item and gives it the Studious property, since the Paladin has improved her investigative skills to better understand potential threats.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "nameSuffix": " of the Guardian",
    "source": "AU",
    "page": 132,
    "rarity": "rare",
    "reqAttune": true,
    "entries": [
      "As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.",
      {
        "type": "entries",
        "name": "Alarm",
        "entries": [
          "The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep."
        ]
      },
      {
        "type": "entries",
        "name": "Supernatural Readiness",
        "entries": [
          "Each subject has {@variantrule Advantage|XPHB} on its {@variantrule Initiative|XPHB} rolls."
        ]
      },
      {
        "type": "entries",
        "name": "Studious",
        "entries": [
          "The DM decides the weapon evolves to a Rare item and gives it the {@table Magic Item Property Tables; Rare Magic Item Properties|AU|Studious} property, since the Paladin has improved her investigative skills to better understand potential threats."
        ]
      }
    ],
    "namePrefix": "Studious ",
    "propertyAdd": [
      "Evo|AU"
    ]
  },
  "hasFluffImages": false,
  "source": "AU"
}
```

</details>



##### Resistant Blade of the Guardian

> Source: AU

As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.

###### Alarm

The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep.

###### Supernatural Readiness

Each subject has Advantage on its Initiative rolls.

###### Studious

The DM decides the weapon evolves to a Rare item and gives it the Studious property, since the Paladin has improved her investigative skills to better understand potential threats.

###### Resistant

When the Paladin defends her companions against infernal forces, the DM decides the weapon evolves again, becoming Very Rare and gaining the Resistant property. The DM chooses Fire as the damage type it grants Resistance to, since that's thematically appropriate.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "nameSuffix": " of the Guardian",
    "source": "AU",
    "page": 132,
    "rarity": "very rare",
    "reqAttune": true,
    "entries": [
      "As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.",
      {
        "type": "entries",
        "name": "Alarm",
        "entries": [
          "The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep."
        ]
      },
      {
        "type": "entries",
        "name": "Supernatural Readiness",
        "entries": [
          "Each subject has {@variantrule Advantage|XPHB} on its {@variantrule Initiative|XPHB} rolls."
        ]
      },
      {
        "type": "entries",
        "name": "Studious",
        "entries": [
          "The DM decides the weapon evolves to a Rare item and gives it the {@table Magic Item Property Tables; Rare Magic Item Properties|AU|Studious} property, since the Paladin has improved her investigative skills to better understand potential threats."
        ]
      },
      {
        "type": "entries",
        "name": "Resistant",
        "entries": [
          "When the Paladin defends her companions against infernal forces, the DM decides the weapon evolves again, becoming Very Rare and gaining the {@table Magic Item Property Tables; Very Rare Magic Item Properties|AU|Resistant} property. The DM chooses Fire as the damage type it grants {@variantrule Resistance|XPHB} to, since that's thematically appropriate."
        ]
      }
    ],
    "namePrefix": "Resistant ",
    "propertyAdd": [
      "Evo|AU"
    ],
    "resist": [
      "fire"
    ]
  },
  "hasFluffImages": false,
  "source": "AU"
}
```

</details>



##### All-Seeing Blade of the Guardian

> Source: AU

As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.

###### Alarm

The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep.

###### Supernatural Readiness

Each subject has Advantage on its Initiative rolls.

###### Studious

The DM decides the weapon evolves to a Rare item and gives it the Studious property, since the Paladin has improved her investigative skills to better understand potential threats.

###### Resistant

When the Paladin defends her companions against infernal forces, the DM decides the weapon evolves again, becoming Very Rare and gaining the Resistant property. The DM chooses Fire as the damage type it grants Resistance to, since that's thematically appropriate.

###### All-Seeing

The DM decides the weapon evolves one final time, becoming Legendary and gaining the All-Seeing property. The DM decides this represents the Paladin becoming a paragon of watchful protection.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Greatsword",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "nameSuffix": " of the Guardian",
    "source": "AU",
    "page": 132,
    "rarity": "legendary",
    "reqAttune": true,
    "entries": [
      "As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.",
      {
        "type": "entries",
        "name": "Alarm",
        "entries": [
          "The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep."
        ]
      },
      {
        "type": "entries",
        "name": "Supernatural Readiness",
        "entries": [
          "Each subject has {@variantrule Advantage|XPHB} on its {@variantrule Initiative|XPHB} rolls."
        ]
      },
      {
        "type": "entries",
        "name": "Studious",
        "entries": [
          "The DM decides the weapon evolves to a Rare item and gives it the {@table Magic Item Property Tables; Rare Magic Item Properties|AU|Studious} property, since the Paladin has improved her investigative skills to better understand potential threats."
        ]
      },
      {
        "type": "entries",
        "name": "Resistant",
        "entries": [
          "When the Paladin defends her companions against infernal forces, the DM decides the weapon evolves again, becoming Very Rare and gaining the {@table Magic Item Property Tables; Very Rare Magic Item Properties|AU|Resistant} property. The DM chooses Fire as the damage type it grants {@variantrule Resistance|XPHB} to, since that's thematically appropriate."
        ]
      },
      {
        "type": "entries",
        "name": "All-Seeing",
        "entries": [
          "The DM decides the weapon evolves one final time, becoming Legendary and gaining the {@table Magic Item Property Tables; Legendary Magic Item Properties|AU|All-Seeing} property. The DM decides this represents the Paladin becoming a paragon of watchful protection."
        ]
      }
    ],
    "namePrefix": "All-Seeing ",
    "propertyAdd": [
      "Evo|AU"
    ],
    "resist": [
      "fire"
    ]
  },
  "hasFluffImages": false,
  "source": "AU"
}
```

</details>



#### Breastplate of the Tyrant

> Source: AU, p. 132

In this example, a Fighter finds an Breastplate of Psychic Resistance while raiding an old dungeon. The armor, a Rare magic item, grants Resistance to Psychic damage and bears the emblem of a barbed crown. Each time the armor evolves, the pattern of spikes around the crown grows more complex.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 132,
  "baseItem": "breastplate|xphb",
  "rarity": "varies",
  "reqAttune": true,
  "weight": 20,
  "property": [
    "Evo|AU"
  ],
  "ac": 14
}
```

</details>

##### Regal Breastplate of the Tyrant (*)

> Source: AU

{#itemEntry Armor of Resistance|XDMG}

###### Regal

When the characters travel to an ancient battlefield, the DM decides the armor evolves, becoming Very Rare and gaining the Regal property. As the characters explore, they uncover iconography matching that on the armor.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Breastplate",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "nameSuffix": " of the Tyrant",
    "source": "AU",
    "page": 132,
    "resist": [
      "psychic"
    ],
    "rarity": "very rare",
    "reqAttune": true,
    "hasRefs": true,
    "entries": [
      "{#itemEntry Armor of Resistance|XDMG}",
      {
        "type": "entries",
        "name": "Regal",
        "entries": [
          "When the characters travel to an ancient battlefield, the DM decides the armor evolves, becoming Very Rare and gaining the {@table Magic Item Property Tables; Very Rare Magic Item Properties|AU|Regal} property. As the characters explore, they uncover iconography matching that on the armor."
        ]
      }
    ],
    "namePrefix": "Regal ",
    "propertyAdd": [
      "Evo|AU"
    ]
  },
  "source": "AU"
}
```

</details>



##### Subjugating Breastplate of the Tyrant (*)

> Source: AU

{#itemEntry Armor of Resistance|XDMG}

###### Regal

When the characters travel to an ancient battlefield, the DM decides the armor evolves, becoming Very Rare and gaining the Regal property. As the characters explore, they uncover iconography matching that on the armor.

###### Subjugating

The characters' investigation leads them to an old castle, where they face an ancient, brutal tyrant wearing a tabard with iconography matching this armor. The characters defeat the tyrant thanks to the Fighter's heroics. The DM decides the armor evolves, becoming Legendary and gaining the Subjugating property.

<details><summary>Structured source fields</summary>

```json
{
  "requires": [
    {
      "name": "Breastplate",
      "source": "XPHB"
    }
  ],
  "inherits": {
    "nameSuffix": " of the Tyrant",
    "source": "AU",
    "page": 132,
    "resist": [
      "psychic"
    ],
    "rarity": "legendary",
    "reqAttune": true,
    "hasRefs": true,
    "entries": [
      "{#itemEntry Armor of Resistance|XDMG}",
      {
        "type": "entries",
        "name": "Regal",
        "entries": [
          "When the characters travel to an ancient battlefield, the DM decides the armor evolves, becoming Very Rare and gaining the {@table Magic Item Property Tables; Very Rare Magic Item Properties|AU|Regal} property. As the characters explore, they uncover iconography matching that on the armor."
        ]
      },
      {
        "type": "entries",
        "name": "Subjugating",
        "entries": [
          "The characters' investigation leads them to an old castle, where they face an ancient, brutal tyrant wearing a tabard with iconography matching this armor. The characters defeat the tyrant thanks to the Fighter's heroics. The DM decides the armor evolves, becoming Legendary and gaining the {@table Magic Item Property Tables; Legendary Magic Item Properties|AU|Subjugating} property."
        ]
      }
    ],
    "namePrefix": "Subjugating ",
    "propertyAdd": [
      "Evo|AU"
    ]
  },
  "source": "AU"
}
```

</details>



#### Rod of the Honed Mind

> Source: AU, p. 133

In this example, a Warlock receives a +1 Rod of the Pact Keeper, an Uncommon magic item. The rod is a gift from a circle of sages who study the Warlock's mysterious patron, an entity from beyond the stars. The rod bears abstruse symbols of unknown origin; each time it evolves, they become more intricate.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "rarity": "varies",
  "reqAttune": "by a warlock",
  "reqAttuneTags": [
    {
      "class": "warlock"
    }
  ],
  "property": [
    "Evo|AU"
  ]
}
```

</details>

##### Vigilant Rod of the Honed Mind

> Source: AU, p. 133

While holding this rod, you gain a +1 bonus to spell attack rolls and to the saving throw DCs of your class=Warlock.

In addition, you can regain one spell slot as a Magic action while holding the rod. You can't use this property again until you finish a Long Rest.

###### Vigilant

After discovering a strange tome full of symbols that match those on the rod, the Warlock feels the approval of the entity that fuels their magic. The DM decides the rod evolves and becomes Rare, gaining the Vigilant property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "rarity": "rare",
  "reqAttune": "by a warlock",
  "reqAttuneTags": [
    {
      "class": "warlock"
    }
  ],
  "weight": 2,
  "bonusSpellAttack": "+1",
  "bonusSpellSaveDc": "+1",
  "property": [
    "Evo|AU"
  ]
}
```

</details>



##### Psionic Rod of the Honed Mind

> Source: AU, p. 133

While holding this rod, you gain a +1 bonus to spell attack rolls and to the saving throw DCs of your class=Warlock.

In addition, you can regain one spell slot as a Magic action while holding the rod. You can't use this property again until you finish a Long Rest.

###### Vigilant

After discovering a strange tome full of symbols that match those on the rod, the Warlock feels the approval of the entity that fuels their magic. The DM decides the rod evolves and becomes Rare, gaining the Vigilant property.

###### Psionic

While exploring clues the Warlock deciphered from the strange tome, the characters acquire psionically charged crystals from the Underdark. The crystals bear the same symbols the rod has. The DM decides the rod evolves to become Very Rare, gaining the Psionic property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "rarity": "very rare",
  "reqAttune": "by a warlock",
  "reqAttuneTags": [
    {
      "class": "warlock"
    }
  ],
  "weight": 2,
  "bonusSpellAttack": "+1",
  "bonusSpellSaveDc": "+1",
  "property": [
    "Evo|AU"
  ]
}
```

</details>



##### Tranquil Rod of the Honed Mind

> Source: AU, p. 133

While holding this rod, you gain a +1 bonus to spell attack rolls and to the saving throw DCs of your class=Warlock.

In addition, you can regain one spell slot as a Magic action while holding the rod. You can't use this property again until you finish a Long Rest.

###### Vigilant

After discovering a strange tome full of symbols that match those on the rod, the Warlock feels the approval of the entity that fuels their magic. The DM decides the rod evolves and becomes Rare, gaining the Vigilant property.

###### Psionic

While exploring clues the Warlock deciphered from the strange tome, the characters acquire psionically charged crystals from the Underdark. The crystals bear the same symbols the rod has. The DM decides the rod evolves to become Very Rare, gaining the Psionic property.

###### Tranquil

Thanks to the Warlock's quick thinking, the characters defeat a band of cultists seeking to destroy anything connected to psionic magic. To reward the Warlock, the DM evolves the rod into its final form, making it Legendary and granting it the Tranquil property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "rarity": "legendary",
  "reqAttune": "by a warlock",
  "reqAttuneTags": [
    {
      "class": "warlock"
    }
  ],
  "weight": 2,
  "bonusSpellAttack": "+1",
  "bonusSpellSaveDc": "+1",
  "property": [
    "Evo|AU"
  ]
}
```

</details>



#### Wand of Celestial Prowess

> Source: AU, p. 133

In this example, a Cleric dedicated to a deity of the sky receives a +1 Wand of the War Mage, an Uncommon magic item, from his mentor. The ebony wand is simple but feels extraordinarily powerful when the Cleric touches it. Each time the wand evolves, carvings of celestial bodies appear along its length.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "rarity": "varies",
  "reqAttune": "by a spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "property": [
    "Evo|AU"
  ]
}
```

</details>

##### Crusading Wand of Celestial Prowess

> Source: AU, p. 133

While holding this wand, you gain a +1 bonus to spell attack rolls. In addition, you ignore Half Cover when making a spell attack roll.

###### Crusading

The Cleric's spellcasting skills help the characters defeat a group of fiendish cultists. The DM decides the wand evolves to become Rare, gaining the Crusading property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "srd52": true,
  "basicRules2024": true,
  "rarity": "rare",
  "reqAttune": "by a spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 1,
  "bonusSpellAttack": "+1",
  "classFeatures": [
    "replicate magic item|artificer|efa|2|efa"
  ],
  "lootTables": [
    "Arcana - Uncommon|XDMG",
    "Relics - Uncommon|XDMG"
  ],
  "property": [
    "Evo|AU"
  ]
}
```

</details>



##### Lunar Wand of Celestial Prowess

> Source: AU, p. 133

While holding this wand, you gain a +1 bonus to spell attack rolls. In addition, you ignore Half Cover when making a spell attack roll.

###### Crusading

The Cleric's spellcasting skills help the characters defeat a group of fiendish cultists. The DM decides the wand evolves to become Rare, gaining the Crusading property.

###### Lunar

The characters track down a devil that serves the Fiend the cultists worshiped. Thanks to the Cleric, the characters defeat the devil, and the DM decides the wand evolves, becoming Very Rare and gaining the Lunar property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "srd52": true,
  "basicRules2024": true,
  "rarity": "very rare",
  "reqAttune": "by a spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 1,
  "bonusSpellAttack": "+1",
  "classFeatures": [
    "replicate magic item|artificer|efa|2|efa"
  ],
  "lootTables": [
    "Arcana - Uncommon|XDMG",
    "Relics - Uncommon|XDMG"
  ],
  "property": [
    "Evo|AU"
  ]
}
```

</details>



##### Heliacal Wand of Celestial Prowess

> Source: AU, p. 133

While holding this wand, you gain a +1 bonus to spell attack rolls. In addition, you ignore Half Cover when making a spell attack roll.

###### Crusading

The Cleric's spellcasting skills help the characters defeat a group of fiendish cultists. The DM decides the wand evolves to become Rare, gaining the Crusading property.

###### Lunar

The characters track down a devil that serves the Fiend the cultists worshiped. Thanks to the Cleric, the characters defeat the devil, and the DM decides the wand evolves, becoming Very Rare and gaining the Lunar property.

###### Heliacal

The Cleric becomes a paragon of his deity, so the DM decides the wand evolves to channel the might of a supernova, becoming Legendary and gaining the Heliacal property.

<details><summary>Structured source fields</summary>

```json
{
  "source": "AU",
  "page": 133,
  "srd52": true,
  "basicRules2024": true,
  "rarity": "legendary",
  "reqAttune": "by a spellcaster",
  "reqAttuneTags": [
    {
      "spellcasting": true
    }
  ],
  "weight": 1,
  "bonusSpellAttack": "+1",
  "classFeatures": [
    "replicate magic item|artificer|efa|2|efa"
  ],
  "lootTables": [
    "Arcana - Uncommon|XDMG",
    "Relics - Uncommon|XDMG"
  ],
  "property": [
    "Evo|AU"
  ]
}
```

</details>



<details><summary>Structured source fields</summary>

```json
{
  "id": "2fe",
  "page": 132
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "2d9",
  "page": 126
}
```

</details>

<details><summary>Structured source fields</summary>

```json
{
  "id": "273",
  "page": 115
}
```

</details>
