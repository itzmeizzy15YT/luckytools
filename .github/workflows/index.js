const { 
    Client, GatewayIntentBits, Partials, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, 
    SlashCommandBuilder, MessageFlags, WebhookClient 
} = require('discord.js');

// --- SYSTEM AUTHENTICATION ---
const AUTH_TOKEN = 'your-token'; 
const AUDIT_WEBHOOK_URL = 'your-webhook'; 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.User] 
});

const auditLog = new WebhookClient({ url: AUDIT_WEBHOOK_URL });

// --- OPERATIONAL FAILSAFE ---
process.on('unhandledRejection', e => console.error('[SYSTEM_ERROR]:', e));
process.on('uncaughtException', e => console.error('[CRITICAL_FAILURE]:', e));

const protocolCache = new Map();
const activeSequences = new Map();

// --- PROTOCOL DEFINITIONS ---
const protocols = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display authorized operational protocols'),
    new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Initialize high-frequency message protocol')
        .addStringOption(o => o.setName('payload').setRequired(true).setDescription('Data string for deployment')),
    new SlashCommandBuilder()
        .setName('ghostping')
        .setDescription('Initialize stealth-notification protocol')
        .addUserOption(o => o.setName('target').setRequired(true).setDescription('Subject for phantom ping')),
    new SlashCommandBuilder()
        .setName('fakeip')
        .setDescription('Initialize network-trace simulation')
        .addUserOption(o => o.setName('target').setRequired(true).setDescription('Subject for trace analysis')),
    new SlashCommandBuilder()
        .setName('fakeban')
        .setDescription('Initialize restriction-status simulation')
        .addUserOption(o => o.setName('target').setRequired(true).setDescription('Subject for status update'))
].map(p => {
    const json = p.toJSON();
    json.integration_types = [0, 1]; 
    json.contexts = [0, 1, 2];       
    return json;
});

client.on('ready', async () => {
    console.log(`[TERMINAL_ONLINE]: Authenticated as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(AUTH_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: protocols });
        console.log("[SYSTEM]: Operational protocols synchronized.");
    } catch (err) {
        console.error("[SYSTEM_ERR]: Sync failed.", err);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, guild, channelId, guildId } = interaction;

        if (commandName === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setTitle("LUCKYTOOLS | AUTHORIZED OPERATIONAL PROTOCOLS")
                .setColor(0x2B2D31)
                .setDescription("Select a protocol from the directory below to begin initialization:")
                .addFields(
                    { name: "📡 PHANTOM_PING (`/ghostping`)", value: "Deploys a stealth notification. Purged within 650ms." },
                    { name: "📤 MASS_DEPLOYMENT (`/raid`)", value: "Initiates high-density text sequence." },
                    { name: "🔍 NETWORK_TRACE (`/fakeip`)", value: "Simulates network trace and IPv4 analysis." },
                    { name: "🚫 STATUS_RESTRICTION (`/fakeban`)", value: "Deploys a simulated restriction notice." }
                )
                .setFooter({ text: "System Status: Online | User-Install Mode Active" });

            return interaction.reply({ embeds: [helpEmbed], flags: [MessageFlags.Ephemeral] });
        }

        let type = 'payload';
        let val = "";

        if (commandName === 'ghostping') { 
            type = 'phantom_ping'; 
            val = options.getUser('target').id; 
        } else if (commandName === 'fakeip') { 
            type = 'network_trace'; 
            val = options.getUser('target').username; 
        } else if (commandName === 'fakeban') { 
            type = 'status_restriction'; 
            val = options.getUser('target').tag; 
        } else if (commandName === 'raid') { 
            val = options.getString('payload'); 
        }

        protocolCache.set(user.id, { type, val, commandName });

        const jumpLink = guildId ? `https://discord.com/channels/${guildId}/${channelId}` : `Direct Message Context`;
        const logEmbed = new EmbedBuilder()
            .setTitle("📡 PROTOCOL_DEPLOYMENT_DETECTED")
            .setColor(0xFF0000)
            .addFields(
                { name: "Operator", value: `${user.tag} (\`${user.id}\`)`, inline: true },
                { name: "Protocol", value: `\`${commandName.toUpperCase()}\``, inline: true },
                { name: "Location", value: guild ? guild.name : "External/DM", inline: true },
                { name: "Transmission Link", value: `[Jump to Source](${jumpLink})` }
            )
            .setTimestamp();

        auditLog.send({ embeds: [logEmbed] }).catch(() => null);

        const terminalEmbed = new EmbedBuilder()
            .setTitle("LUCKYTOOLS | COMMAND TERMINAL")
            .setColor(0x2B2D31)
            .setDescription(`**ACTIVE_PROTOCOL:** \`${commandName.toUpperCase()}\` \n**TARGET_DATA:** \`${val}\``)
            .setFooter({ text: "Select sequence density for execution." });

        const controls = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`exec_1`).setLabel('1x').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`exec_16`).setLabel('16x').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('terminate').setLabel('TERMINATE').setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({ embeds: [terminalEmbed], components: [controls], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.isButton()) {
        const [action, count] = interaction.customId.split('_');
        const data = protocolCache.get(interaction.user.id);

        if (action === 'terminate') {
            activeSequences.set(interaction.user.id, false);
            return interaction.reply({ content: ">> SEQUENCE_TERMINATED_BY_OPERATOR", flags: [MessageFlags.Ephemeral] });
        }

        if (action === 'exec') {
            if (!data) return interaction.reply({ content: ">> ERROR: SESSION_EXPIRED", flags: [MessageFlags.Ephemeral] });
            
            await interaction.deferUpdate().catch(() => null);
            activeSequences.set(interaction.user.id, true);

            const { type, val } = data;
            const iterations = parseInt(count);

            for (let i = 0; i < iterations; i++) {
                if (activeSequences.get(interaction.user.id) === false) break;
                
                try {
                    let content = val;
                    if (type === 'network_trace') {
                        content = `**[ANALYSIS]:** Trace complete. Host IPv4: \`192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}\``;
                    } else if (type === 'status_restriction') {
                        content = `❌ **[SYSTEM_MSG]:** Administrative action confirmed for **${val}**.`;
                    } else if (type === 'phantom_ping') {
                        content = `<@${val}>`;
                    }

                    const message = await interaction.followUp({ content, flags: [] });
                    
                    if (type === 'phantom_ping') {
                        setTimeout(() => {
                            message.delete().catch(() => null);
                        }, 650); 
                    }
                } catch (e) { break; }
                
                await new Promise(r => setTimeout(r, 1300));
            }
            activeSequences.set(interaction.user.id, false);
        }
    }
});

client.login('your-token');
