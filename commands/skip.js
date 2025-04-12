module.exports = {
  name: 'skip',
  description: 'Skip the current song',
  run: async (client, interaction, manager) => {
    const player = manager.players.get(interaction.guild.id);
    if (!player || !player.queue.current) return interaction.reply('❌ ไม่มีเพลงที่กำลังเล่น');
    player.stop();
    interaction.reply('⏭️ ข้ามเพลงแล้ว');
  }
};
