require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { Manager } = require('erela.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// โหลดไฟล์คำสั่งทั้งหมดจากโฟลเดอร์ /commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// สร้าง Lavalink Manager
const manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,
      port: parseInt(process.env.LAVALINK_PORT),
      password: process.env.LAVALINK_PASSWORD,
      secure: false, // สำคัญมากสำหรับ Render!
    },
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

client.manager = manager;

manager.on('nodeConnect', node => {
  console.log(`✅ Lavalink node "${node.options.host}" connected.`);
});

manager.on('nodeError', (node, error) => {
  console.error(`❌ Lavalink node error: ${error.message}`);
});

// ลงทะเบียน Slash Command
client.once('ready', async () => {
  console.log(`🎵 Logged in as ${client.user.tag}`);

  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v10');

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = client.commands.map(command => ({
    name: command.name,
    description: command.description,
    options: command.options || [],
  }));

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
});

// คำสั่ง
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.run(client, interaction, client.manager);
  } catch (error) {
    console.error(`❌ Error in command /${interaction.commandName}:`, error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
        ephemeral: true,
      });
    }
  }
});

// ให้ erela.js รับ voice updates
client.on('raw', d => client.manager.updateVoiceState(d));

// ✅ login แล้วเชื่อม Lavalink
client.login(process.env.DISCORD_TOKEN).then(() => {
  client.manager.init(client.user.id); // ← สำคัญ!
});
