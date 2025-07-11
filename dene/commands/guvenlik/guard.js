// commands/guvenlik/guard.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings, GuardWhitelist } = require('../../database');

const guardActions = [
    { name: 'Rol Koruması (Oluşturma/Silme)', value: 'roleGuard' },
    { name: 'Kanal Koruması (Oluşturma/Silme)', value: 'channelGuard' },
    { name: 'Sunucu Koruması (URL, İsim vb.)', value: 'guildGuard' },
    { name: 'Yasaklama/Atma Koruması', value: 'banKickGuard' },
];

const data = new SlashCommandBuilder()
    .setName('guard')
    .setDescription('Sunucu koruma (guard) ayarları.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

data.addSubcommand(subcommand =>
    subcommand.setName('log-ayarla')
        .setDescription('Bir koruma işlemi için log kanalını ayarlar.')
        .addStringOption(option => option.setName('işlem').setDescription('Logu ayarlanacak koruma türü').setRequired(true).addChoices(...guardActions))
        .addChannelOption(option => option.setName('kanal').setDescription('Log kanalı').setRequired(true))
);

data.addSubcommand(subcommand =>
    subcommand.setName('aç-kapat')
        .setDescription('Bir koruma türünü açar veya kapatır.')
        .addStringOption(option => option.setName('işlem').setDescription('Açılıp/kapatılacak koruma türü').setRequired(true).addChoices(...guardActions))
        .addStringOption(option => option.setName('durum').setDescription('Yeni durum').setRequired(true).addChoices({ name: 'Aç', value: 'on' }, { name: 'Kapat', value: 'off' }))
);

data.addSubcommand(subcommand =>
    subcommand.setName('durum')
        .setDescription('Tüm koruma ayarlarının durumunu gösterir.')
);

data.addSubcommand(subcommand =>
    subcommand.setName('yetkili-ekle')
        .setDescription('Bir kullanıcıyı korumalardan muaf listesine ekler.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Muaf tutulacak kullanıcı').setRequired(true))
        // YENİ: işlem parametresi artık opsiyonel. Belirtilmezse hepsi için ekler.
        .addStringOption(option => option.setName('işlem').setDescription('Muaf olacağı koruma türü (belirtilmezse hepsi)').setRequired(false).addChoices(...guardActions))
);

data.addSubcommand(subcommand =>
    subcommand.setName('yetkili-sil')
        .setDescription('Bir kullanıcıyı muaf listesinden çıkarır.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Muafiyeti kaldırılacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('işlem').setDescription('Kaldırılacak muafiyet türü (belirtilmezse hepsi)').setRequired(false).addChoices(...guardActions))
);

data.addSubcommand(subcommand =>
    subcommand.setName('yetkilileri-göster')
        .setDescription('Tüm muaf yetkilileri listeler.')
);

module.exports = {
    data: data,
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const islemKey = interaction.options.getString('işlem');
        const islemAdi = guardActions.find(a => a.value === islemKey)?.name;
        const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;

        if (subcommand === 'yetkili-ekle') {
            const kullanıcı = interaction.options.getUser('kullanıcı');
            
            // Eğer bir işlem belirtilmediyse, tüm işlemler için ekle
            if (!islemKey) {
                for (const action of guardActions) {
                    await GuardWhitelist.findOrCreate({ where: { userId: kullanıcı.id, action: action.value } });
                }
                const allActionNames = guardActions.map(a => `\`${a.value}\``).join(', ');
                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🔒 Kullanıcı Eklendi')
                    .setDescription(`${kullanıcı}, **${allActionNames}** için güvenlik listesine eklendi.`);
                if (website) embed.setFooter({ text: `${website} | Guard` });
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // Eğer bir işlem belirtildiyse, sadece o işlem için ekle
            await GuardWhitelist.findOrCreate({ where: { userId: kullanıcı.id, action: islemKey } });
            await interaction.editReply(`<@${kullanıcı.id}>, **${islemAdi}** korumasından başarıyla muaf tutuldu.`);
        }
        else if (subcommand === 'yetkili-sil') {
            const kullanıcı = interaction.options.getUser('kullanıcı');
            
            // Eğer bir işlem belirtilmediyse, tüm işlemlerden çıkar
            if (!islemKey) {
                await GuardWhitelist.destroy({ where: { userId: kullanıcı.id } });
                return interaction.editReply(`<@${kullanıcı.id}> kullanıcısının **tüm** korumalardaki muafiyeti kaldırıldı.`);
            }

            // Eğer bir işlem belirtildiyse, sadece o işlemden çıkar
            await GuardWhitelist.destroy({ where: { userId: kullanıcı.id, action: islemKey } });
            await interaction.editReply(`<@${kullanıcı.id}> kullanıcısının **${islemAdi}** korumasındaki muafiyeti kaldırıldı.`);
        }
        // ... (diğer alt komutlar aynı kalacak)
        else if (subcommand === 'log-ayarla') {
            const kanal = interaction.options.getChannel('kanal');
            await Settings.upsert({ key: `${islemKey}Log`, value: kanal.id });
            await interaction.editReply(`**${islemAdi}** için log kanalı <#${kanal.id}> olarak ayarlandı.`);
        } 
        else if (subcommand === 'aç-kapat') {
            const durum = interaction.options.getString('durum') === 'on';
            await Settings.upsert({ key: `${islemKey}Status`, value: durum });
            await interaction.editReply(`**${islemAdi}** koruması başarıyla **${durum ? 'AÇILDI' : 'KAPATILDI'}**.`);
        }
        else if (subcommand === 'durum') {
            const settings = await Settings.findAll({ where: { key: guardActions.map(a => [`${a.value}Status`, `${a.value}Log`]).flat() } });
            const embed = new EmbedBuilder().setTitle('Guard Durum Paneli').setColor('#E74C3C');
            for (const action of guardActions) {
                const status = settings.find(s => s.key === `${action.value}Status`)?.value ?? false;
                const logChannelId = settings.find(s => s.key === `${action.value}Log`)?.value;
                embed.addFields({
                    name: action.name,
                    value: `**Durum:** ${status ? '✅ Açık' : '❌ Kapalı'}\n**Log Kanalı:** ${logChannelId ? `<#${logChannelId}>` : 'Ayarlanmamış'}`
                });
            }
            await interaction.editReply({ embeds: [embed] });
        }
        else if (subcommand === 'yetkilileri-göster') {
            const whitelist = await GuardWhitelist.findAll();
            if (whitelist.length === 0) return interaction.editReply('Muaf tutulan hiçbir yetkili bulunmuyor.');
            
            const embed = new EmbedBuilder().setTitle('Guard Muafiyet Listesi').setColor('#3498DB');
            let description = '';
            for (const action of guardActions) {
                const yetkililer = whitelist.filter(w => w.action === action.value).map(w => `<@${w.userId}>`);
                if (yetkililer.length > 0) {
                    description += `**${action.name}**\n${yetkililer.join(', ')}\n\n`;
                }
            }
            embed.setDescription(description || 'Listelenecek yetkili bulunamadı.');
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
