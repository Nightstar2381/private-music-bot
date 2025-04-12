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
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();

// โหลดคำสั่งจากโฟลเดอร์ /commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// สร้าง Lavalink Manager (Render ใช้ HTTP, port 80, secure: false)
const manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,       // lavalink-private.onrender.com
      port: Number(process.env.LAVALINK_PORT), // 80
      password: process.env.LAVALINK_PASSWORD, // รหัสผ่าน
      secure: false, // ✅ สำคัญมาก! Render ใช้ HTTP เท่านั้น
    }
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

client.manager = manager;

// ✅ เชื่อม Lavalink แล้วแสดงสถานะ
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

  const commands = client.commands.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || [],
  }));

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (err) {
    console.error('❌ Deploy Error:', err);
  }
});

// รองรับ interaction command
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

// อัปเดต voice state
client.on('raw', d => client.manager.updateVoiceState(d));

// ✅ เริ่มเชื่อมบอท + Lavalink
client.login(process.env.DISCORD_TOKEN).then(() => {
  client.manager.init(client.user.id);
});
