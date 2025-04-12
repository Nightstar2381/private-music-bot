const { EmbedBuilder } = require('discord.js');

exports.createNowPlayingEmbed = (track, user) => {
  return new EmbedBuilder()
    .setColor('Blue')
    .setTitle(`🎶 Playing: ${track.title}`)
    .setURL(track.uri)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      { name: '⌛ Duration', value: track.duration, inline: true },
      { name: '🎧 Requested by', value: user.username, inline: true }
    )
    .setFooter({ text: user.username, iconURL: user.displayAvatarURL() });
};
