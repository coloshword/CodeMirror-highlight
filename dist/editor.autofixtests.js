const AutoFixTests = [
  {
    pre: '; Use this procedure to set up the coins\n; This procedure will create a single coin with the specified shape, color, and size\n; To create more coins, simply change the number in the "create-coins" command\n; To change the properties of the coins, modify the "set shape", "set color", and "set size" commands\n\nto setup-coins\n  ; Create a new breed called "coins"\n  breed [ coins coin ]\n  ; Use the "create-" command to create a single coin\n  create-coins\n  1 [\n    ; Set the shape of the coin\n    set shape "circle"\n    ; Set the color of the coin\n    set color red\n    ; Set the size of the coin\n    set size 1\n  ]\nend',
    post: '; Create a new breed called "coins"\nbreed [ coins coin ]\n; Use this procedure to set up the coins\n; This procedure will create a single coin with the specified shape, color, and size\n; To create more coins, simply change the number in the "create-coins" command\n; To change the properties of the coins, modify the "set shape", "set color", and "set size" commands\n\nto setup-coins\n  ; Use the "create-" command to create a single coin\n  create-coins 1 [\n    ; Set the shape of the coin\n    set shape "circle"\n    ; Set the color of the coin\n    set color red\n    ; Set the size of the coin\n    set size 1\n  ]\nend',
  },
  { pre: 'to create-turtles\n  create-turtles 10\nend', post: 'to setup-turtles\n  create-turtles 10\nend' },
  {
    pre: 'to create-turtles\n  ; Create 10 turtles using the breed name "turtles"\n  create-turtles\n\n  10 [\n    ; Set the turtle"s position to a random location\n    setxy random-xcor random-ycor\n  ] \nend',
    post: 'to setup-turtles\n  ; Create 10 turtles using the breed name "turtles"\n  create-turtles 10 [\n    ; Set the turtle"s position to a random location\n    setxy random-xcor random-ycor\n  ]\nend',
  },
  {
    pre: 'globals [ color something-else ]\nbreed [ trains train ]\ntrains-own [ size ]\nto create-trains\n  create-trains 100 [ set color red ]\nend\nto setup\n  create-trains\nend',
    post: 'globals [ something-else ]\nbreed [ trains train ]\nto setup-trains\n  create-trains 100 [\n    set color red\n  ]\nend',
  },
  {
    pre: '; create a central turtle\ncreate-turtles 1\n\n              [\n                set color red\n                set size 2\n                setxy 0 0 ; place the turtle at the center of the world\n              ]\n\n                ; create 10 wabbits around the central turtle\n                create-wabbits 10 [\n                  set color white\n                  set size 1\n                  setxy (5 * sin (360 / 10 * who))\n                       (5 * cos (360 / 10 * who)) ; place the wabbits in a circle around the central turtle\n                  face one-of turtles with [ color = red ] ; make the wabbits face the central turtle\n                ] ',
    post: '; create a central turtle\ncreate-turtles 1 [\n  set color red\n  set size 2\n  setxy 0 0 ; place the turtle at the center of the world\n]\n\n; create 10 wabbits around the central turtle\ncreate-wabbits 10 [\n  set color white\n  set size 1\n  setxy (5 * sin (360 / 10 * who))\n        (5 * cos (360 / 10 * who)) ; place the wabbits in a circle around the central turtle\n  face one-of turtles with [ color = red ] ; make the wabbits face the central turtle\n]',
  },
  {
    pre: 'make-grid\n\nto make-grid\n; Create patches for the chessboard\nask patches [\n  ; Set the color of each patch based on its coordinates\n  ifelse (pxcor + pycor) mod 2 = 0\n  [ set pcolor white ]\n  [ set pcolor black ]\n]\n   end',
    post: 'to make-grid\n  ; Create patches for the chessboard\n  ask patches [\n    ; Set the color of each patch based on its coordinates\n    ifelse (pxcor + pycor) mod 2 = 0\n           [ set pcolor white ]\n           [ set pcolor black ]\n  ]\nend',
  },
  {
    pre: '; Create a breed called "rabbits"\nbreed [ rabbits rabbit ]\n\n; Use the "create-rabbits" command to create 100 rabbits\ncreate-rabbits\n  100 [\n    ; Set the location of each rabbit to a random location on the x and y axis\n    setxy random-xcor random-ycor ]',
    post: '; Create a breed called "rabbits"\nbreed [ rabbits rabbit ]\n\nto play\n  ; Use the "create-rabbits" command to create 100 rabbits\n  create-rabbits 100 [\n    ; Set the location of each rabbit to a random location on the x and y axis\n    setxy random-xcor random-ycor\n  ]\nend',
  },
];
