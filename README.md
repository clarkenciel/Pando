# Pando
Pando is a distributed, chat-based sound installation. A Pando instance is a chatroom website
that is tuned to a fundamental frequency. When a room is created, Pando generates a new pitch
relative to the fundamental, using James Tenney's harmonic crystal algorithm, and assigns that
pitch to the room so that it becomes the room's fundamental. This process then recurs within
the room each time a user is added, so that each user has their own drone, tuned to a specific
pitch-node in the room's crystal.

As a user posts to the room two changes occur: their posts cause changes in the rhythmic and
timbral character of their drone, and their post "pulls" the fundamental frequency of the room
the frequency of their drone. The former creates local variation for the user while the latter
creates macro-level variation as the room's crystal structure is "transposed" through different
harmonic spaces.

Users can either enter a room in one of two ways. First, as a regular user which allows them to post
and thus change the room, but only with sonic access to their own drone. Second, as a "watcher" user
who cannot interact with the room, but gains access to all of the drones at once.

## License

Copyright © 2016 Danny Clarke

Distributed under the MIT License.
