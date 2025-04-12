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
    try {
      const query = interaction.options.getString('query');a
      console.log('▶️ /play used by:', interaction.user.username);
      console.log('🎵 Query:', query);

      const allowedChannel = process.env.MUSIC_CHANNEL_ID;
      if (interaction.channel.id !== allowedChannel) {
        return interaction.reply({ content: '❌ ใช้คำสั่งนี้ได้เฉพาะในห้องที่กำหนดเท่านั้น!', ephemeral: true });
      }

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: '❌ กรุณาเข้าห้องเสียงก่อนใช้คำสั่งนี้!', ephemeral: true });
      }

      const player = manager.create({
        guild: interaction.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channel.id,
        selfDeafen: true,
      });

      player.connect();

      const res = await manager.search(query, interaction.user);
      console.log('🔎 Search result:', res.loadType);

      if (res.loadType === 'NO_MATCHES') {
        return interaction.reply({ content: '❌ ไม่พบเพลงที่ค้นหา!', ephemeral: true });
      }

      player.queue.add(res.tracks[0]);

      const embed = createNowPlayingEmbed(res.tracks[0], interaction.user);
      await interaction.reply({ embeds: [embed] });

      if (!player.playing && !player.paused && player.queue.size) {
        player.play();
      }

    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาดใน /play:', err);
      return interaction.reply({ content: '❌ เกิดข้อผิดพลาด! กรุณาตรวจสอบ Console Log ใน Render', ephemeral: true });
    }
  }
};
