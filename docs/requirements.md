This is a repo for a real time multiplayer casual game where
users navigate a dark maze and have to reach an exit. The
map is revealed as users explore it.

## Architecture

- node
- typescript
- express.js
- server that brokers real time communication (websockets)
- client app in browser
- react / canvas / svg
- run on linux server

## General game requirements

- 2D overhead view
- users can be colored squares, or some simple marker. user name is attached/located under their square so that other players can see who it is
- users use arrow keys of ASDW keys to move in cardinal directions
- users spawn "near" each other, within close proximity
- maze is dark/hidden
- area _around_ a user is illuminated, and stays illuminated
- as a user walks around, more of the map becomes illuminated/revealed
- users all share what has been illuminated/revealed

- users are not allowed to intersect or move through the solid tiles of the maze

Will need the concept of a distance or tile, based on maze building.

Area around a user that is illuminated might be "3 tiles". 

User pawn size might be 50% the size of a tile (?). 

Tiles are revealed as users explore. 

## Objective/goal

One special tile on the map will be an obvious goal.

## Maze / map building

When a "game" starts, it builds a random map based on
a wave-collapse function and a well-known tile algorithm.
If using SVG, construct reusable tile chunk elements to use
for the wave collapse function.

Users "spawn" near each other, but not all in the exact same location.

Tile algorithm will need to differentiate between open space and
solid tiles/structures. Users cannot travel/move through solid
structures.

For a first iteration, plan for a map that is 100 x 100 tiles.

## app flow

Users join the app, and are immediately put into a "lobby". 
Users can see who else is in the lobby based on username.
Users can type in whatever username they want. No auth.
Lobby will include a "start" button, that anybody can click.
When the start button is clicked, the maze is generated and
the game starts.

When a user reaches the objective tile, the game stops for everyone
and shows a "game over message". Users can click to return to 
the lobby.

Game state is not saved in a database. This is just all in memory.
