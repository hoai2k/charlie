// Delivered doll art for the riding toys and special actions, kept apart from
// the track settings in tracks.js because it's long and generated: which dolls
// have a toys / actions sheet, their art versions (cache stamps for those
// sheets), and each sheet's per-frame calibration (anchor, scale, wand tip...)
// written by the image tools (tools/dolls/toys, tools/dolls/actions).
// Dolls (asset keys) whose roller-skate / pogo sheet is delivered:
// assets/doll_<key>_toys.webp and its mask (image-requests.md §8).
window.RIDE_TOY_ART_VERSION = "20261022-marisol-toys2";
window.RIDE_TOY_SHEETS = [
  "lily",
  "mira",
  "hermione",
  "whirlpool",
  "juliette",
  "claudia-v2",
  "kaya",
  "amanda",
  "penelope",
  "rumi-v2",
  "barbie",
  "cinnamon",
  "felicity",
  "luna",
  "marisol-v2",
  "zoey",
  "annie",
  "katniss",
  "cornsilk"
];
// Packed frame calibration preserves anatomy when long hair or fall poses need more room.
window.RIDE_TOY_FRAMES = {
  "lily": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.54225352112675,
      225,
      225,
      225,
      225,
      225,
      190.46610169491527
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0391904055270391,
      1.0367394847592868,
      1.0367394847592868,
      1.0058548130387153,
      1.0,
      1.0
    ]
  },
  "mira": {
    "anchorX": [
      255,
      227,
      249,
      253,
      256,
      224.59756097560975,
      225,
      225,
      225,
      225,
      225,
      225.2925659472422
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0084018965276809,
      1.0038697531725003,
      1.0,
      1.0,
      1.0
    ]
  },
  "hermione": {
    "anchorX": [
      233,
      225,
      250,
      225,
      234,
      225.35479797979798,
      225,
      225,
      225,
      225,
      225,
      203.6919128329298
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0082508250825082,
      1.0058672533920059,
      1.0082508250825082,
      1.0,
      1.0,
      1.0412464703509479
    ]
  },
  "whirlpool": {
    "anchorX": [
      253,
      225,
      247,
      225,
      225,
      225.46593406593408,
      225,
      225,
      225,
      225,
      225,
      222.5611591384667
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.1823154225534913,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0262913931842623,
      1.0124225905736641,
      1.1798401476327636
    ]
  },
  "juliette": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.91946308724835,
      225,
      225,
      225,
      225,
      225,
      222.26659204712814
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0021338340730626,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0700751109593718,
      1.0598839194264253,
      1.1351174236345156
    ]
  },
  "claudia-v2": {
    "anchorX": [
      225,
      208,
      225,
      225,
      235,
      183.7568493150685,
      225,
      225,
      225,
      225,
      225,
      184.16445892495983
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0146708101467081,
      1.0041013225410131,
      1.0604719231047193,
      1.053425598034256,
      1.0066219183412546
    ]
  },
  "kaya": {
    "anchorX": [
      280,
      225,
      225,
      225,
      225,
      225.64705882352942,
      225,
      225,
      225,
      225,
      225,
      177.4372303153236
    ],
    "scale": [
      1.0005414603960396,
      1.0,
      1.0,
      1.012855816831683,
      1.0190129950495048,
      1.0,
      1.0005414603960396,
      1.043641707920792,
      1.0220915841584157,
      1.0775061881188117,
      1.0775061881188117,
      1.0997323166774822
    ]
  },
  "amanda": {
    "anchorX": [
      225,
      225,
      225,
      225,
      248,
      225.12155963302752,
      225,
      225,
      225,
      225,
      225,
      224.65575916230367
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "penelope": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.7581344902386,
      225,
      225,
      225,
      225,
      225,
      203.81786542923436
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0108716754028344,
      1.0,
      1.0694282663560475,
      1.0632644146767618,
      1.0
    ]
  },
  "rumi-v2": {
    "anchorX": [
      234,
      225,
      236,
      225,
      225,
      189.68899521531102,
      225,
      225,
      225,
      225,
      225,
      174.24343675417663
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "barbie": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      213.75974025974028,
      225,
      225,
      225,
      225,
      225,
      191.07476635514018
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.009101618377135,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "cinnamon": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      189.6892156862745,
      225,
      225,
      225,
      225,
      225,
      189.4956043956044
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.087186388541767,
      1.0528213015476304,
      1.0
    ]
  },
  "felicity": {
    "anchorX": [
      250,
      225,
      247,
      225,
      225,
      220.0640776699029,
      225,
      225,
      225,
      225,
      219,
      220.16411128183333
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0191429359654232,
      1.0161542470036478,
      1.0190898187633262
    ]
  },
  "luna": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      219.99594320486818,
      225,
      225,
      225,
      225,
      222,
      195.14685314685318
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0410599883517764,
      1.0442147155892059,
      1.0,
      1.0,
      1.0726072607260726,
      1.0095127159774802,
      1.075761987963502,
      1.0662978062512132,
      1.0
    ]
  },
  "marisol-v2": {
    "anchorX": [
      291,
      225,
      225,
      225,
      238,
      225,
      225,
      225,
      225,
      225,
      178,
      225
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.1057657000481527,
      1.0233387210009626,
      1.125315377124646,
      1.1237237004950495,
      1.265382920529128
    ]
  },
  "zoey": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225.35774647887322,
      225,
      225,
      225,
      225,
      225,
      225,
      225
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0179802816901409,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "annie": {
    "anchorX": [
      225,
      225,
      225,
      225,
      208.81395348837208,
      214.7986798679868,
      225,
      225,
      225,
      225,
      225,
      201.96449704142012
    ],
    "scale": [
      1.2639480514238948,
      1.2900472737246829,
      1.2788618927386308,
      1.293775734053367,
      1.2825903530673148,
      1.1297234795912687,
      1.2527626704378425,
      1.3608880199696802,
      1.2378488291231062,
      1.4130864645712569,
      1.4130864645712569,
      1.2602195910952105
    ]
  },
  "katniss": {
    "anchorX": [
      229.32394366197184,
      225,
      231.85507246376812,
      225,
      225,
      164.84210526315792,
      225,
      225,
      225,
      225,
      225,
      151.80952380952385
    ],
    "scale": [
      1.0751326255135125,
      1.1023895089772353,
      1.0448471994427095,
      1.105418051584316,
      1.0599899124781111,
      1.0357615716214685,
      1.0357615716214685,
      1.0811897107276733,
      1.0,
      1.0963324237630747,
      1.0721040829064323,
      1.2083885002250467
    ]
  },
  "cornsilk": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      250.43,
      225,
      225,
      225,
      225,
      225,
      253.79727272727274
    ],
    "scale": [
      1.0307587149692414,
      1.0396445659603555,
      1.0159489633173844,
      1.0070631123262703,
      1.0,
      1.0189109136477557,
      1.0,
      1.0159489633173844,
      1.0,
      1.0129870129870129,
      1.0,
      1.0
    ]
  }
};
// Dolls (asset keys) whose actions sheet is delivered: wand casting, surfing,
// saddle push, stuck in a puddle, moon-boots float (image-requests.md §10).
window.ACTION_SHEETS = [
  "hermione",
  "lily",
  "mira",
  "whirlpool",
  "claudia-v2",
  "kaya",
  "amanda",
  "penelope",
  "rumi-v2",
  "juliette",
  "barbie",
  "cinnamon",
  "felicity",
  "luna",
  "marisol-v2",
  "zoey",
  "annie",
  "katniss",
  "cornsilk"
];
window.ACTION_ART_VERSION = "20261022-marisol-v2";
window.ACTION_FRAMES = {
  "hermione": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0031343283582088,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        55,
        7,
        339,
        409
      ],
      "wandTip": [
        330,
        11
      ],
      "sourceScale": 0.94,
      "packedScale": 0.9370629370629371,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        44,
        50,
        400,
        409
      ],
      "wandTip": [
        394,
        164
      ],
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 231.56,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        54,
        375,
        409
      ],
      "wandTip": [
        369,
        239
      ],
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 226.85999999999999,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        28,
        352,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 276.67999999999995,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        28,
        367,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        10,
        71,
        347,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -38.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 380.02,
      "bounds": [
        25,
        66,
        367,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        31,
        49,
        318,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        43,
        49,
        373,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.94,
      "packedScale": 0.94,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "lily": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        92,
        15,
        314,
        409
      ],
      "wandTip": [
        269,
        19
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        76,
        58,
        387,
        409
      ],
      "wandTip": [
        381,
        168
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        95,
        66,
        401,
        409
      ],
      "wandTip": [
        395,
        255
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        18,
        85,
        342,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        9,
        84,
        335,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        90,
        61,
        401,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -50.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 379.69101123595505,
      "bounds": [
        112,
        68,
        373,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        66,
        69,
        309,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 214.62078651685394,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        71,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "mira": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.099502487562189,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        69,
        7,
        308,
        409
      ],
      "wandTip": [
        193,
        11
      ],
      "sourceScale": 1.0,
      "packedScale": 0.9095022624434389,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        8,
        49,
        390,
        409
      ],
      "wandTip": [
        384,
        168
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        7,
        27,
        380,
        409
      ],
      "wandTip": [
        375,
        201
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 257.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        8,
        356,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 277.7799043062201,
      "offsetX": 0,
      "scale": 1.0398009950248757,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        7,
        84,
        364,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 0.9617224880382775,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0422885572139302,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        8,
        7,
        342,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 0.9594272076372315,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 13.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 369.0,
      "bounds": [
        12,
        62,
        374,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 264.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        49,
        351,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        21,
        45,
        398,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "whirlpool": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0261194029850746,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        49,
        7,
        319,
        409
      ],
      "wandTip": [
        81,
        12
      ],
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9617224880382775,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        19,
        44,
        385,
        409
      ],
      "wandTip": [
        379,
        152
      ],
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        35,
        46,
        404,
        409
      ],
      "wandTip": [
        396,
        168
      ],
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        9,
        58,
        341,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 259.81578947368416,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        55,
        326,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        42,
        59,
        376,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 13.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 379.5394736842105,
      "bounds": [
        38,
        40,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        7,
        61,
        306,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 218.80263157894737,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        32,
        39,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9868421052631579,
      "packedScale": 0.9868421052631579,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "claudia-v2": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0573637834921776,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        86,
        7,
        322,
        409
      ],
      "wandTip": [
        122,
        12
      ],
      "sourceScale": 0.963855421686747,
      "packedScale": 0.9115646258503401,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        14,
        23,
        377,
        409
      ],
      "wandTip": [
        372,
        167
      ],
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        9,
        15,
        341,
        409
      ],
      "wandTip": [
        335,
        215
      ],
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 154.30120481927713,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        55,
        61,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 189.96385542168676,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        65,
        32,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 247.50602409638554,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        51,
        354,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 59.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 384.09638554216866,
      "bounds": [
        14,
        43,
        380,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 300.51807228915663,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        40,
        338,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        48,
        53,
        402,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.963855421686747,
      "packedScale": 0.963855421686747,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "kaya": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.037313432835821,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        53,
        7,
        305,
        409
      ],
      "wandTip": [
        162,
        11
      ],
      "sourceScale": 1.0,
      "packedScale": 0.9640287769784173,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        35,
        65,
        387,
        409
      ],
      "wandTip": [
        382,
        162
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        65,
        60,
        403,
        409
      ],
      "wandTip": [
        360,
        211
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 227.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        81,
        352,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 282.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        89,
        363,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        39,
        81,
        398,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -18.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 395.0,
      "bounds": [
        34,
        36,
        341,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 234.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        46,
        325,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        40,
        67,
        395,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "amanda": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        88,
        27,
        312,
        409
      ],
      "wandTip": [
        300,
        32
      ],
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        69,
        75,
        402,
        409
      ],
      "wandTip": [
        396,
        184
      ],
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        58,
        69,
        412,
        409
      ],
      "wandTip": [
        407,
        138
      ],
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        59,
        83,
        402,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 207.65,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        100,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        72,
        70,
        406,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -20.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 370.0,
      "bounds": [
        73,
        69,
        369,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        31,
        82,
        306,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        72,
        70,
        408,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "penelope": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.1257995735607673,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        124,
        7,
        363,
        409
      ],
      "wandTip": [
        172,
        12
      ],
      "sourceScale": 1.0285714285714285,
      "packedScale": 0.9136363636363637,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 215.05714285714288,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        55,
        35,
        413,
        409
      ],
      "wandTip": [
        408,
        150
      ],
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        32,
        26,
        387,
        409
      ],
      "wandTip": [
        381,
        102
      ],
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        35,
        54,
        395,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        25,
        62,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        17,
        48,
        384,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -37.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 453.45714285714286,
      "bounds": [
        71,
        18,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        70,
        24,
        379,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 223.2857142857143,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        34,
        25,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0285714285714285,
      "packedScale": 1.0285714285714285,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "rumi-v2": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0657960199004974,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        7,
        328,
        409
      ],
      "wandTip": [
        183,
        12
      ],
      "sourceScale": 0.95,
      "packedScale": 0.8913525498891353,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 221.9,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        46,
        44,
        413,
        409
      ],
      "wandTip": [
        408,
        160
      ],
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        64,
        42,
        382,
        409
      ],
      "wandTip": [
        377,
        81
      ],
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        27,
        86,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 249.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        6,
        92,
        348,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        35,
        75,
        365,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 13.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 352.0,
      "bounds": [
        56,
        66,
        359,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        19,
        50,
        315,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        27,
        48,
        396,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.95,
      "packedScale": 0.95,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "juliette": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0746268656716418,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        93,
        7,
        360,
        409
      ],
      "wandTip": [
        346,
        11
      ],
      "sourceScale": 1.0588235294117647,
      "packedScale": 0.9852941176470589,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 197.32105263157897,
      "offsetX": 0,
      "scale": 1.0008779631255489,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        11,
        12,
        413,
        409
      ],
      "wandTip": [
        408,
        126
      ],
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0578947368421052,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 160.30026109660577,
      "offsetX": 0,
      "scale": 1.0087796312554873,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        46,
        7,
        413,
        409
      ],
      "wandTip": [
        407,
        87
      ],
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0496083550913837,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 214.05882352941177,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        23,
        23,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0588235294117647,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        24,
        33,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0588235294117647,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 152.6470588235294,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        38,
        24,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0588235294117647,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 217.63917525773195,
      "offsetX": -38.0,
      "scale": 1.0219490781387182,
      "baseline": 409,
      "targetY": 414.47058823529414,
      "bounds": [
        62,
        7,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0360824742268042,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 212.13157894736844,
      "offsetX": 0,
      "scale": 1.0008779631255489,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        64,
        7,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0578947368421052,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 255.2442748091603,
      "offsetX": 0,
      "scale": 1.0351185250219492,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        7,
        381,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0588235294117647,
      "packedScale": 1.0229007633587786,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "barbie": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.1705058522416816,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        86,
        7,
        351,
        409
      ],
      "wandTip": [
        335,
        10
      ],
      "sourceScale": 1.0867052023121386,
      "packedScale": 0.9284064665127021,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 212.296875,
      "offsetX": 0,
      "scale": 1.0380467604175652,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        48,
        7,
        413,
        409
      ],
      "wandTip": [
        408,
        149
      ],
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.046875,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0353435136456446,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        63,
        12,
        410,
        409
      ],
      "wandTip": [
        362,
        181
      ],
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0496083550913837,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.1164409168032667,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        16,
        44,
        379,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 0.9733656174334141,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 291.53513513513514,
      "offsetX": 0,
      "scale": 1.0002013056106749,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        7,
        405,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0864864864864865,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0272337733298824,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        6,
        8,
        378,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0578947368421052,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 3.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 357.86705202312135,
      "bounds": [
        71,
        32,
        385,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0867052023121386,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        14,
        8,
        330,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0867052023121386,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 224.69942196531792,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        37,
        24,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0867052023121386,
      "packedScale": 1.0867052023121386,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "cinnamon": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0522388059701493,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        75,
        7,
        296,
        409
      ],
      "wandTip": [
        145,
        11
      ],
      "sourceScale": 1.0,
      "packedScale": 0.950354609929078,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        51,
        41,
        385,
        409
      ],
      "wandTip": [
        378,
        163
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        48,
        43,
        410,
        409
      ],
      "wandTip": [
        390,
        228
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 228.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        47,
        351,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 207.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        52,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        35,
        7,
        372,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 31.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 378.0,
      "bounds": [
        67,
        33,
        360,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        46,
        36,
        343,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        45,
        47,
        389,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "felicity": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.134273384458921,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        84,
        7,
        309,
        409
      ],
      "wandTip": [
        172,
        11
      ],
      "sourceScale": 1.0386740331491713,
      "packedScale": 0.9157175398633257,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 220.22651933701658,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        36,
        23,
        413,
        409
      ],
      "wandTip": [
        408,
        147
      ],
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 208.8011049723757,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        60,
        17,
        413,
        409
      ],
      "wandTip": [
        408,
        126
      ],
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 234.36923076923074,
      "offsetX": 0,
      "scale": 1.0076688381297931,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        7,
        378,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0307692307692307,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 294.17127071823205,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        65,
        389,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        13,
        25,
        374,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -43.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 399.1160220994475,
      "bounds": [
        50,
        30,
        391,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0025013056265633,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        33,
        7,
        341,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0360824742268042,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        11,
        48,
        368,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0386740331491713,
      "packedScale": 1.0386740331491713,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "luna": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.14525326583457,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        62,
        7,
        319,
        409
      ],
      "wandTip": [
        150,
        11
      ],
      "sourceScale": 1.0935672514619883,
      "packedScale": 0.9548693586698337,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0092374385383027,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        9,
        7,
        367,
        409
      ],
      "wandTip": [
        361,
        135
      ],
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0835579514824798,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 217.62228260869563,
      "offsetX": 0,
      "scale": 1.0010764889005266,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        25,
        7,
        413,
        409
      ],
      "wandTip": [
        408,
        89
      ],
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0923913043478262,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 258.2991913746631,
      "offsetX": 0,
      "scale": 1.0092374385383027,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        27,
        407,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0835579514824798,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 322.27777777777777,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        46,
        403,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0935672514619883,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 210.28654970760235,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        34,
        22,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0935672514619883,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": -47.0,
      "scale": 1.0173983881760786,
      "baseline": 409,
      "targetY": 413.5906432748538,
      "bounds": [
        46,
        7,
        375,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0748663101604279,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 255.0233918128655,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        16,
        344,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0935672514619883,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 213.02046783625732,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        15,
        28,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0935672514619883,
      "packedScale": 1.0935672514619883,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "marisol-v2": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        15,
        351,
        409
      ],
      "wandTip": [
        339,
        19
      ],
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        72,
        38,
        404,
        409
      ],
      "wandTip": [
        398,
        138
      ],
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 224.3956834532374,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        41,
        36,
        413,
        409
      ],
      "wandTip": [
        409,
        139
      ],
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 227.87769784172662,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        6,
        26,
        369,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 235.83453237410072,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        13,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 189.9877551020408,
      "offsetX": 0,
      "scale": 1.0391388381831848,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        11,
        62,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5469387755102041,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 225,
      "offsetX": 24.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 375.53956834532374,
      "bounds": [
        53,
        51,
        384,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 229.58273381294964,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        45,
        330,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    },
    {
      "anchorX": 189.15827338129495,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        15,
        24,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.5683453237410072,
      "packedScale": 0.5683453237410072,
      "pivotMethod": "glasses or skin highlight with reviewed head-scale calibration"
    }
  ],
  "zoey": [
    {
      "bounds": [
        114,
        36,
        325,
        409
      ],
      "source": "sources/zoey/special-wand.webp",
      "cell": 0,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        400,
        714
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        292,
        111
      ],
      "wandTip": [
        311,
        41
      ]
    },
    {
      "bounds": [
        107,
        35,
        354,
        409
      ],
      "source": "sources/zoey/special-wand.webp",
      "cell": 1,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        330,
        715
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        352,
        137
      ],
      "wandTip": [
        347,
        142
      ]
    },
    {
      "bounds": [
        103,
        35,
        336,
        409
      ],
      "source": "sources/zoey/special-wand.webp",
      "cell": 2,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        302,
        714
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        334,
        138
      ],
      "wandTip": [
        330,
        143
      ]
    },
    {
      "bounds": [
        31,
        56,
        395,
        409
      ],
      "source": "sources/zoey/special-surf.webp",
      "cell": 0,
      "sourceScaleRatio": 0.98,
      "sourceAnchor": [
        370,
        691
      ],
      "packedScale": 0.5189859154929577,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        363,
        214
      ],
      "wandTip": null
    },
    {
      "bounds": [
        24,
        58,
        384,
        409
      ],
      "source": "sources/zoey/special-surf.webp",
      "cell": 1,
      "sourceScaleRatio": 0.98,
      "sourceAnchor": [
        371,
        691
      ],
      "packedScale": 0.5189859154929577,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        334,
        286
      ],
      "wandTip": null
    },
    {
      "bounds": [
        57,
        48,
        386,
        409
      ],
      "source": "sources/zoey/special-surf.webp",
      "cell": 2,
      "sourceScaleRatio": 0.98,
      "sourceAnchor": [
        325,
        704
      ],
      "packedScale": 0.5189859154929577,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        335,
        282
      ],
      "wandTip": null
    },
    {
      "bounds": [
        94,
        68,
        372,
        409
      ],
      "source": "sources/zoey/special-other.webp",
      "cell": 0,
      "sourceScaleRatio": 0.94,
      "sourceAnchor": [
        320,
        704
      ],
      "packedScale": 0.4978028169014084,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 363.06276056338027,
      "offsetX": 37.335211267605644,
      "hand": [
        339,
        191
      ],
      "wandTip": null
    },
    {
      "bounds": [
        40,
        69,
        390,
        409
      ],
      "source": "sources/zoey/special-other.webp",
      "cell": 1,
      "sourceScaleRatio": 0.94,
      "sourceAnchor": [
        384,
        710
      ],
      "packedScale": 0.4978028169014084,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        389,
        231
      ],
      "wandTip": null
    },
    {
      "bounds": [
        57,
        69,
        394,
        409
      ],
      "source": "sources/zoey/special-other.webp",
      "cell": 2,
      "sourceScaleRatio": 0.94,
      "sourceAnchor": [
        331,
        697
      ],
      "packedScale": 0.4978028169014084,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        375,
        163
      ],
      "wandTip": null
    }
  ],
  "annie": [
    {
      "bounds": [
        98,
        41,
        390,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        125.5,
        401
      ],
      "placement": [
        98,
        41,
        390,
        409
      ],
      "sourceBounds": [
        6,
        6,
        319,
        401
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        342,
        115
      ],
      "wandTip": [
        384,
        53
      ]
    },
    {
      "bounds": [
        64,
        39,
        412,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 204.91094756655585,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        140.5,
        403
      ],
      "placement": [
        64,
        39,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        380,
        403
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        409,
        150
      ],
      "wandTip": [
        405,
        152
      ]
    },
    {
      "bounds": [
        80,
        40,
        395,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        144.0,
        402
      ],
      "placement": [
        80,
        40,
        395,
        409
      ],
      "sourceBounds": [
        6,
        6,
        344,
        402
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        393,
        221
      ],
      "wandTip": [
        389,
        222
      ]
    },
    {
      "bounds": [
        52,
        67,
        412,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 224.00625268090076,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        173.0,
        373
      ],
      "placement": [
        52,
        67,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        392,
        373
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        384,
        192
      ],
      "wandTip": null
    },
    {
      "bounds": [
        27,
        71,
        405,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        201.5,
        370
      ],
      "placement": [
        27,
        70,
        405,
        409
      ],
      "sourceBounds": [
        6,
        6,
        412,
        370
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        403,
        229
      ],
      "wandTip": null
    },
    {
      "bounds": [
        70,
        57,
        412,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 211.8970348035113,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        141.0,
        384
      ],
      "placement": [
        70,
        57,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        373,
        384
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        366,
        201
      ],
      "wandTip": null
    },
    {
      "bounds": [
        113,
        41,
        372,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 378.0595176220261,
      "offsetX": 7.582233347842305,
      "sourceAnchor": [
        109.0,
        401
      ],
      "placement": [
        113,
        41,
        373,
        409
      ],
      "sourceBounds": [
        6,
        6,
        285,
        401
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        370,
        152
      ],
      "wandTip": null
    },
    {
      "bounds": [
        79,
        52,
        412,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 208.1711216104684,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        127.0,
        389
      ],
      "placement": [
        79,
        52,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        363,
        389
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        410,
        199
      ],
      "wandTip": null
    },
    {
      "bounds": [
        38,
        53,
        366,
        409
      ],
      "packedScale": 0.9314782982607271,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        190.0,
        388
      ],
      "placement": [
        38,
        53,
        367,
        409
      ],
      "sourceBounds": [
        6,
        6,
        359,
        388
      ],
      "sourceScale": 0.9314782982607271,
      "hand": [
        353,
        134
      ],
      "wandTip": null
    }
  ],
  "katniss": [
    {
      "bounds": [
        92,
        9,
        412,
        409
      ],
      "packedScale": 0.9569377990430622,
      "scale": 1.0511339612882302,
      "renderScale": 1.0511339612882302,
      "anchorX": 213.16746411483254,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        115.5,
        424
      ],
      "placement": [
        92,
        9,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        340,
        424
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        363,
        95
      ],
      "wandTip": [
        406,
        37
      ]
    },
    {
      "bounds": [
        36,
        9,
        412,
        409
      ],
      "packedScale": 0.963855421686747,
      "scale": 1.0435899376426208,
      "renderScale": 1.0435899376426208,
      "anchorX": 158.12048192771084,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        118.0,
        421
      ],
      "placement": [
        34,
        9,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        398,
        421
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        410,
        127
      ],
      "wandTip": [
        406,
        126
      ]
    },
    {
      "bounds": [
        80,
        9,
        407,
        409
      ],
      "packedScale": 0.9592326139088729,
      "scale": 1.0486192867396937,
      "renderScale": 1.0486192867396937,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        140.0,
        423
      ],
      "placement": [
        80,
        9,
        407,
        409
      ],
      "sourceBounds": [
        6,
        6,
        347,
        423
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        349,
        116
      ],
      "wandTip": [
        400,
        72
      ]
    },
    {
      "bounds": [
        29,
        61,
        408,
        409
      ],
      "packedScale": 1.0058698194145743,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        184.5,
        352
      ],
      "placement": [
        29,
        61,
        408,
        409
      ],
      "sourceBounds": [
        6,
        6,
        383,
        352
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        373,
        230
      ],
      "wandTip": null
    },
    {
      "bounds": [
        6,
        44,
        392,
        409
      ],
      "packedScale": 1.0058698194145743,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 242.2854904517918,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        225.0,
        369
      ],
      "placement": [
        6,
        44,
        392,
        409
      ],
      "sourceBounds": [
        6,
        6,
        390,
        369
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        390,
        239
      ],
      "wandTip": null
    },
    {
      "bounds": [
        42,
        37,
        412,
        409
      ],
      "packedScale": 1.0058698194145743,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 210.73211900645194,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        158.0,
        376
      ],
      "placement": [
        42,
        37,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        374,
        376
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        390,
        162
      ],
      "wandTip": null
    },
    {
      "bounds": [
        124,
        9,
        412,
        409
      ],
      "packedScale": 0.9900990099009901,
      "scale": 1.01592851760872,
      "renderScale": 1.01592851760872,
      "anchorX": 214.63366336633663,
      "baseline": 409,
      "targetY": 389.97513618348125,
      "offsetX": -23.577588567077637,
      "sourceAnchor": [
        81.5,
        410
      ],
      "placement": [
        124,
        9,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        297,
        410
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        384,
        134
      ],
      "wandTip": null
    },
    {
      "bounds": [
        102,
        9,
        407,
        409
      ],
      "packedScale": 0.9852216748768473,
      "scale": 1.0209578667057928,
      "renderScale": 1.0209578667057928,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        114.5,
        412
      ],
      "placement": [
        102,
        9,
        407,
        409
      ],
      "sourceBounds": [
        6,
        6,
        316,
        412
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        405,
        163
      ],
      "wandTip": null
    },
    {
      "bounds": [
        34,
        22,
        412,
        409
      ],
      "packedScale": 1.0058698194145743,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 211.23505391615925,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "sourceAnchor": [
        166.5,
        391
      ],
      "placement": [
        34,
        22,
        412,
        409
      ],
      "sourceBounds": [
        6,
        6,
        382,
        391
      ],
      "sourceScale": 1.0058698194145743,
      "hand": [
        396,
        136
      ],
      "wandTip": null
    }
  ],
  "cornsilk": [
    {
      "bounds": [
        34,
        10,
        371,
        409
      ],
      "packedScale": 1.0310077519379846,
      "scale": 1.0108059404710121,
      "renderScale": 1.0108059404710121,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": [
        365,
        67
      ],
      "sourceAnchor": [
        176.04,
        393
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        12,
        13,
        399,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": [
        393,
        211
      ],
      "sourceAnchor": [
        195.21,
        386
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        10,
        10,
        359,
        409
      ],
      "packedScale": 1.0336787564766838,
      "scale": 1.0081940388160484,
      "renderScale": 1.0081940388160484,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": [
        353,
        73
      ],
      "sourceAnchor": [
        198.66,
        392
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        11,
        52,
        365,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "sourceAnchor": [
        196.4,
        349
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        8,
        46,
        360,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "sourceAnchor": [
        198.66,
        354
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        19,
        36,
        364,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "sourceAnchor": [
        188.05,
        364
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        42,
        44,
        363,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 358.84,
      "offsetX": 12.879999999999995,
      "hand": [
        353.91,
        219.33
      ],
      "wandTip": null,
      "sourceAnchor": [
        166.68,
        356
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        7,
        59,
        394,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 231.78408264462806,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "sourceAnchor": [
        206.34,
        342
      ],
      "sourceScaleRatio": 0.97
    },
    {
      "bounds": [
        7,
        41,
        391,
        409
      ],
      "packedScale": 1.0421487603305783,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 230.09580165289256,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "sourceAnchor": [
        204.72000000000003,
        359
      ],
      "sourceScaleRatio": 0.97
    }
  ]
};


window.LEDGE_FRAMES = {
  "zoey": [
    {
      "bounds": [
        49,
        43,
        369,
        409
      ],
      "source": "sources/zoey/ledge.webp",
      "cell": 0,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        411.0,
        719
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        368,
        154
      ],
      "wandTip": null,
      "corner": [
        303.79,
        165.92
      ]
    },
    {
      "bounds": [
        106,
        46,
        313,
        409
      ],
      "source": "sources/zoey/ledge.webp",
      "cell": 1,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        306.0,
        693
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        309,
        280
      ],
      "wandTip": null,
      "corner": [
        236.01,
        206.17
      ]
    },
    {
      "bounds": [
        80,
        107,
        338,
        409
      ],
      "source": "sources/zoey/ledge.webp",
      "cell": 2,
      "sourceScaleRatio": 1,
      "sourceAnchor": [
        369.0,
        586
      ],
      "packedScale": 0.5295774647887324,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": [
        303,
        168
      ],
      "wandTip": null,
      "corner": [
        221.18,
        403.17
      ]
    }
  ],
  "cornsilk": [
    {
      "bounds": [
        25,
        11,
        353,
        409
      ],
      "packedScale": 0.6446280991735537,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "corner": [
        278.04,
        225.75
      ],
      "sourceAnchor": [
        291.6,
        624
      ],
      "sourceScaleRatio": 0.6
    },
    {
      "bounds": [
        72,
        10,
        317,
        409
      ],
      "packedScale": 0.6205287713841369,
      "scale": 1.0388367613247995,
      "renderScale": 1.0388367613247995,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "corner": [
        260.6,
        225.46
      ],
      "sourceAnchor": [
        227.76000000000002,
        649
      ],
      "sourceScaleRatio": 0.6
    },
    {
      "bounds": [
        75,
        78,
        319,
        409
      ],
      "packedScale": 0.6446280991735537,
      "scale": 1.0,
      "renderScale": 1.0,
      "anchorX": 225,
      "baseline": 409,
      "targetY": 409,
      "offsetX": 0,
      "hand": null,
      "wandTip": null,
      "corner": [
        216.31,
        399.08
      ],
      "sourceAnchor": [
        213.9,
        519
      ],
      "sourceScaleRatio": 0.6
    }
  ]
};

// Dolls (asset keys) whose cloud ledge sheet is delivered (image-requests.md
// §29: hug hold, climbing up, kneeling on top), and in each of its three
// poses the point that goes on the cloud's edge, in frame px (copied from
// assets/doll_ledge_anchors.json, written by tools/dolls/ledge).
window.LEDGE_ART_VERSION = "20261023-ledge2";
window.LEDGE_ANCHORS = {
  "amanda": [
    [
      285,
      189
    ],
    [
      237,
      232
    ],
    [
      131,
      351
    ]
  ],
  "barbie": [
    [
      282,
      197
    ],
    [
      232,
      246
    ],
    [
      144,
      358
    ]
  ],
  "cinnamon": [
    [
      286,
      207
    ],
    [
      238,
      252
    ],
    [
      113,
      363
    ]
  ],
  "claudia-v2": [
    [
      298,
      204
    ],
    [
      242,
      246
    ],
    [
      108,
      373
    ]
  ],
  "felicity": [
    [
      293,
      203
    ],
    [
      240,
      248
    ],
    [
      129,
      360
    ]
  ],
  "hermione": [
    [
      289,
      197
    ],
    [
      241,
      230
    ],
    [
      97,
      360
    ]
  ],
  "juliette": [
    [
      287,
      177
    ],
    [
      239,
      216
    ],
    [
      129,
      353
    ]
  ],
  "kaya": [
    [
      285,
      188
    ],
    [
      237,
      237
    ],
    [
      177,
      361
    ]
  ],
  "lily": [
    [
      286,
      198
    ],
    [
      238,
      253
    ],
    [
      112,
      354
    ]
  ],
  "luna": [
    [
      292,
      185
    ],
    [
      239,
      233
    ],
    [
      102,
      360
    ]
  ],
  "marisol-v2": [
    [
      287,
      190
    ],
    [
      235,
      260
    ],
    [
      119,
      357
    ]
  ],
  "mira": [
    [
      298,
      196
    ],
    [
      243,
      243
    ],
    [
      102,
      364
    ]
  ],
  "penelope": [
    [
      280,
      189
    ],
    [
      238,
      234
    ],
    [
      110,
      354
    ]
  ],
  "rumi-v2": [
    [
      285,
      196
    ],
    [
      236,
      221
    ],
    [
      140,
      339
    ]
  ],
  "whirlpool": [
    [
      284,
      195
    ],
    [
      237,
      233
    ],
    [
      104,
      351
    ]
  ],
  "zoey": [
    [
      303.79,
      165.92
    ],
    [
      236.01,
      206.17
    ],
    [
      221.18,
      403.17
    ]
  ],
  "annie": [
    [
      352.42,
      183.12
    ],
    [
      296.53,
      241.45
    ],
    [
      212.72,
      390.78
    ]
  ],
  "katniss": [
    [
      328.19,
      195.53
    ],
    [
      282.79,
      248.15
    ],
    [
      204.0,
      390.0
    ]
  ],
  "cornsilk": [
    [
      278.04,
      225.75
    ],
    [
      260.6,
      225.46
    ],
    [
      216.31,
      399.08
    ]
  ]
};

window.LEDGE_SHEETS = [
  "amanda",
  "barbie",
  "cinnamon",
  "claudia-v2",
  "felicity",
  "hermione",
  "juliette",
  "kaya",
  "lily",
  "luna",
  "marisol-v2",
  "mira",
  "penelope",
  "rumi-v2",
  "whirlpool",
  "zoey",
  "annie",
  "katniss",
  "cornsilk"
];

window.DOLL_WING_ROOTS = {
  "cornsilk": {
    "sprites": [
      [
        179.75,
        238.25,
        249.1,
        209.0
      ],
      [
        180.39,
        237.61,
        256.44,
        209.0
      ],
      [
        180.56,
        237.44,
        253.5,
        209.0
      ],
      [
        179.54,
        232.4,
        260.99,
        205.97
      ],
      [
        179.87,
        232.73,
        253.95,
        206.3
      ],
      [
        176.59,
        230.41,
        258.29,
        203.5
      ],
      [
        194.72,
        238.24,
        307.47,
        216.48
      ],
      [
        183.3,
        234.7,
        285.62,
        209.0
      ],
      [
        192.89,
        234.95,
        316.46,
        213.92
      ],
      [
        206.45,
        255.77,
        234.41,
        231.11
      ],
      [
        189.88,
        239.04,
        287.76,
        214.46
      ],
      [
        213.93,
        253.41,
        314.24,
        233.67
      ]
    ],
    "toys": [
      [
        182.2,
        242.06,
        221.47,
        212.13
      ],
      [
        179.07,
        238.93,
        225.46,
        209.0
      ],
      [
        173.5,
        233.34,
        225.46,
        203.42
      ],
      [
        184.41,
        244.26,
        229.45,
        214.33
      ],
      [
        186.13,
        244.63,
        241.3,
        215.38
      ],
      [
        217.63,
        259.21,
        309.2,
        238.42
      ],
      [
        183.33,
        239.71,
        262.43,
        211.52
      ],
      [
        179.07,
        238.93,
        233.44,
        209.0
      ],
      [
        183.3,
        240.02,
        246.38,
        211.66
      ],
      [
        181.53,
        241.39,
        237.43,
        211.46
      ],
      [
        188.69,
        247.89,
        235.32,
        218.29
      ],
      [
        223.29,
        275.77,
        248.08,
        249.53
      ]
    ],
    "actions": [
      [
        179.07,
        238.93,
        245.41,
        209.0
      ],
      [
        175.43,
        234.83,
        242.67,
        205.13
      ],
      [
        175.58,
        235.44,
        233.44,
        205.51
      ],
      [
        182.19,
        235.81,
        276.74,
        209.0
      ],
      [
        185.32,
        239.72,
        278.44,
        212.52
      ],
      [
        177.57,
        233.53,
        263.5,
        205.55
      ],
      [
        181.64,
        236.36,
        277.69,
        209.0
      ],
      [
        177.92,
        230.44,
        268.94,
        204.18
      ],
      [
        186.51,
        241.69,
        258.17,
        214.1
      ]
    ],
    "ledge": [
      [
        175.83,
        235.59,
        225.75,
        205.71
      ],
      [
        176.61,
        236.47,
        245.41,
        206.54
      ],
      [
        184.2,
        233.8,
        293.26,
        209.0
      ]
    ]
  }
};
