module.exports = {
  name: 'queue',
  description: 'Show the current music queue',
  run: async (client, interaction, manager) => {
    const player = manager.players.get(interaction.guild.id);
    if (!player || !player.queue || !player.queue.length) {
      return interaction.reply('📭 คิวเพลงว่างเปล่า');
    }
    const queueString = player.queue.slice(0, 10).map((track, i) => {
      return `**${i + 1}.** [${track.title}](${track.uri}) • ขอโดย: ${track.requester.username}`;
    }).join('\n');

    interaction.reply({ content: `📜 **คิวเพลง:**\n${queueString}` });
  }
};
