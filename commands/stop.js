module.exports = {
  name: 'stop',
  description: 'Stop the music and clear the queue',
  run: async (client, interaction, manager) => {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply('❌ ไม่มีเพลงที่กำลังเล่น');
    player.destroy();
    interaction.reply('⏹️ หยุดเพลงและล้างคิวแล้ว');
  }
};
