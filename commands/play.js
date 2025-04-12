const { createNowPlayingEmbed } = require('../utils/embed');

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube or SoundCloud',
  options: [{
    name: 'query',
    description: 'The name or URL of the song',
    type: 3,
    required: true,
  }],
  run: async (client, interaction, manager) => {
    const allowedChannel = process.env.MUSIC_CHANNEL_ID;
    if (interaction.channel.id !== allowedChannel) {
      return interaction.reply({ content: '❌ ใช้คำสั่งนี้ได้เฉพาะในห้องที่กำหนดเท่านั้น!', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    const player = manager.create({
      guild: interaction.guild.id,
      voiceChannel: interaction.member.voice.channel.id,
      textChannel: interaction.channel.id,
      selfDeafen: true,
    });
    player.connect();
    const res = await manager.search(query, interaction.user);
    if (res.loadType === 'NO_MATCHES') return interaction.reply('❌ ไม่พบเพลง');
    player.queue.add(res.tracks[0]);
    const embed = createNowPlayingEmbed(res.tracks[0], interaction.user);
    interaction.reply({ embeds: [embed] });
    if (!player.playing && !player.paused && !player.queue.size) player.play();
  }
};
