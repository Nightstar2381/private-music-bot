require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { Manager } = require('erela.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});
client.commands = new Collection();

// โหลดคำสั่ง
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
  commands.push({
    name: command.name,
    description: command.description,
    options: command.options || []
  });
}

// Deploy Slash Command
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (error) {
    console.error(error);
  }
})();

// Lavalink Manager
const manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,
      port: parseInt(process.env.LAVALINK_PORT),
      password: process.env.LAVALINK_PASSWORD,
      secure: false,
    }
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  manager.init(client.user.id);
});

client.on('raw', d => manager.updateVoiceState(d));

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (command) {
    try {
      await command.run(client, interaction, manager);
    } catch (error) {
      console.error(error);
      interaction.reply({ content: '❌ เกิดข้อผิดพลาด!', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
