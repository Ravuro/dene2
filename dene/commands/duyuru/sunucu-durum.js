// commands/duyuru/sunucu-durum.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu-durum')
        .setDescription('Sunucu durumunu bildiren şık duyurular gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('aktif')
                .setDescription('Sunucunun aktif olduğunu duyurur.')
                .addStringOption(option => option.setName('mesaj').setDescription('Duyuruya eklenecek özel mesaj.').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('bakım')
                .setDescription('Sunucunun bakıma girdiğini duyurur.')
                .addStringOption(option => option.setName('mesaj').setDescription('Duyuruya eklenecek özel mesaj.').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('restart')
                .setDescription('Sunucuya restart atıldığını duyurur.')
                .addStringOption(option => option.setName('mesaj').setDescription('Duyuruya eklenecek özel mesaj.').setRequired(false))
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const ozelMesaj = interaction.options.getString('mesaj');

        // Gerekli tüm ayarları veritabanından çek (cfx-kodu eklendi)
        const settingsKeys = ['sunucu-ip', 'cfx-kodu', 'discord-davet', 'ticketChannel', 'sunucu-website', `${subcommand}-resim`];
        const settings = await Settings.findAll({ where: { key: settingsKeys } });
        const getSetting = (key) => settings.find(s => s.key === key)?.value;

        const sunucuIp = getSetting('sunucu-ip') || 'Ayarlanmamış';
        const cfxKodu = getSetting('cfx-kodu'); // Buton için CFX kodunu al
        const discordDavet = getSetting('discord-davet') || 'Ayarlanmamış';
        const ticketKanalId = getSetting('ticketChannel');
        const website = getSetting('sunucu-website');
        const imageUrl = getSetting(`${subcommand}-resim`);

        let durum, renk, baslik;
        switch (subcommand) {
            case 'aktif':
                durum = '🟢ONLINE'; renk = '#2ECC71'; baslik = 'Sunucu AKTİF, giriş yapabilirsiniz!'; break;
            case 'bakım':
                durum = '🔴BAKIM'; renk = '#E67E22'; baslik = 'Sunucu BAKIMDA, anlayışınız için teşekkürler.'; break;
            case 'restart':
                durum = '🟡RESTART'; renk = '#3498DB'; baslik = 'Sunucuya RESTART atılıyor, lütfen oyunda kalın.'; break;
        }

        let aciklama = `${baslik}\n${ozelMesaj ? `\n**Yetkili Notu:** ${ozelMesaj}\n` : ''}`;
        aciklama += `\n- Herhangi bir konuda destek almak için ${ticketKanalId ? `<#${ticketKanalId}>` : '#ticket-oluştur'} kanalını kullanabilirsiniz.`;
        aciklama += `\n- Discord davet bağlantımız: ${discordDavet}`;

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setColor(renk)
            .setDescription(aciklama)
            .addFields(
                { name: 'DURUM', value: `\`\`\`\n${durum}\n\`\`\``, inline: true },
                { name: 'SUNUCU IP', value: `\`\`\`\n${sunucuIp}\n\`\`\``, inline: true }
            )
            .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);
        if (website) embed.setFooter({ text: `${website} | Sunucu ${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)}` });

        const components = [];
        // YENİ: Sadece CFX kodu ayarlıysa butonu ekle
        if (cfxKodu) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Sunucuya Bağlan')
                    .setStyle(ButtonStyle.Link)
                    .setURL(cfxKodu) // CFX linkini kullan
                    .setEmoji('🎮')
            );
            components.push(row);
        }

        await interaction.channel.send({ embeds: [embed], components: components });
        await interaction.editReply('Durum duyurusu başarıyla gönderildi.');
    },
};
