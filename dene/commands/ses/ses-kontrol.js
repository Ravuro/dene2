// commands/ses/ses-kontrol.js
const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-kontrol')
        .setDescription('Botun ses kanalı kontrolleri.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('gir')
                .setDescription('Botu belirtilen ses kanalına bağlar.')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Bağlanılacak ses kanalı')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('çık')
                .setDescription('Botu bağlı olduğu sesli kanaldan çıkarır.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'gir') {
            const channel = interaction.options.getChannel('kanal');

            if (!channel) {
                return interaction.reply({ content: 'Lütfen geçerli bir ses kanalı belirtin.', flags: MessageFlags.Ephemeral });
            }

            try {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                await interaction.reply({ content: `Başarıyla **${channel.name}** kanalına bağlandım!`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Ses kanalına bağlanırken bir hata oluştu.', flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === 'çık') {
            const connection = getVoiceConnection(interaction.guild.id);

            if (connection) {
                connection.destroy();
                await interaction.reply({ content: 'Ses kanalından başarıyla ayrıldım.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'Zaten bir ses kanalında değilim.', flags: MessageFlags.Ephemeral });
            }
        }
    },
};
