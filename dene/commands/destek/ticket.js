// commands/destek/ticket.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const { TicketCategories } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gelişmiş, görsel destekli ticket sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('panel-gönder')
                .setDescription('Görsel ve kategorileri içeren destek panelini gönderir.')
                .addChannelOption(option => option.setName('kanal').setDescription('Panelin gönderileceği kanal').setRequired(true))
                .addStringOption(option => option.setName('başlık').setDescription('Paneldeki başlık').setRequired(true))
                .addStringOption(option => option.setName('açıklama').setDescription('Paneldeki açıklama. Yeni satır için \\n kullanın.').setRequired(true))
                .addStringOption(option => option.setName('resim-url').setDescription('Panelde gösterilecek büyük resmin URL\'si').setRequired(false))
                .addStringOption(option => option.setName('footer').setDescription('Panelin altındaki yazı').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('kategori-ekle')
                .setDescription('Panele yeni bir buton/kategori ekler.')
                .addStringOption(option => option.setName('isim').setDescription('Kategorinin adı (örn: Oyun İçi Destek)').setRequired(true))
                .addRoleOption(option => option.setName('destek-rolü').setDescription('Bu kategoriyle ilgilenecek yetkili rolü').setRequired(true))
                .addStringOption(option => option.setName('stil').setDescription('Butonun rengi').setRequired(true)
                    .addChoices(
                        { name: 'Mavi', value: 'Primary' },
                        { name: 'Gri', value: 'Secondary' },
                        { name: 'Yeşil', value: 'Success' },
                        { name: 'Kırmızı', value: 'Danger' }
                    ))
                .addStringOption(option => option.setName('emoji').setDescription('Butonda görünecek emoji').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('kategori-sil')
                .setDescription('Bir ticket kategorisini siler.')
                .addStringOption(option => option.setName('isim').setDescription('Silinecek kategorinin tam adı').setRequired(true))
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'kategori-ekle') {
            const isim = interaction.options.getString('isim');
            const destekRolu = interaction.options.getRole('destek-rolü');
            const stil = interaction.options.getString('stil');
            const emoji = interaction.options.getString('emoji');
            
            const categoryId = isim.toLowerCase().replace(/ /g, '-');
            await TicketCategories.create({
                categoryId: categoryId, guildId: interaction.guild.id,
                name: isim, supportRoleId: destekRolu.id,
                style: stil, emoji: emoji,
            });
            await interaction.editReply(`**${isim}** adında yeni bir ticket kategorisi başarıyla oluşturuldu.`);
        }
        else if (subcommand === 'kategori-sil') {
            const isim = interaction.options.getString('isim');
            const categoryId = isim.toLowerCase().replace(/ /g, '-');
            const result = await TicketCategories.destroy({ where: { categoryId: categoryId, guildId: interaction.guild.id } });
            if (result > 0) await interaction.editReply(`**${isim}** kategorisi başarıyla silindi.`);
            else await interaction.editReply(`**${isim}** adında bir kategori bulunamadı.`);
        }
        else if (subcommand === 'panel-gönder') {
            const kanal = interaction.options.getChannel('kanal');
            const baslik = interaction.options.getString('başlık');
            // Kullanıcıdan gelen metni al
            const aciklamaInput = interaction.options.getString('açıklama');
            const resimUrl = interaction.options.getString('resim-url');
            const footerText = interaction.options.getString('footer');

            // YENİ EKLENEN KISIM: Kullanıcının girdiği "\\n" metnini gerçek bir yeni satır karakterine (\n) dönüştür.
            const aciklama = aciklamaInput.replace(/\\n/g, '\n');

            const categories = await TicketCategories.findAll({ where: { guildId: interaction.guild.id } });
            if (categories.length === 0) {
                return interaction.editReply('Hiç ticket kategorisi oluşturulmamış! Lütfen önce `/ticket kategori-ekle` komutuyla kategori ekleyin.');
            }

            const embed = new EmbedBuilder()
                .setTitle(baslik)
                .setDescription(aciklama) // Dönüştürülmüş metni burada kullan
                .setColor('#5865f2ff');
            
            if (resimUrl) embed.setImage(resimUrl);
            if (footerText) embed.setFooter({ text: footerText });

            const rows = [];
            for (let i = 0; i < categories.length; i += 5) {
                const row = new ActionRowBuilder();
                const batch = categories.slice(i, i + 5);
                batch.forEach(cat => {
                    const button = new ButtonBuilder()
                        .setCustomId(`ticket_create_${cat.categoryId}`)
                        .setLabel(cat.name)
                        .setStyle(ButtonStyle[cat.style]);
                    if (cat.emoji) button.setEmoji(cat.emoji);
                    row.addComponents(button);
                });
                rows.push(row);
            }

            await kanal.send({ embeds: [embed], components: rows });
            await interaction.editReply('Ticket paneli başarıyla gönderildi.');
        }
    },
};
