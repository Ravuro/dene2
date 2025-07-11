// commands/kayit/wl-kayit.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings, Registrations, Tickets } = require('../../database'); // Gerekli modelleri import ediyoruz
require('dotenv').config();

// Steam kimliğini HEX'e çeviren yardımcı fonksiyon
async function getSteamHex(steamIdentity) {
    let steamID64 = '';
    const match = steamIdentity.match(/(?:profiles\/|id\/)?(\d{17})/);
    if (match && match[1]) {
        steamID64 = match[1];
    } else if (/^\d{17}$/.test(steamIdentity)) {
        steamID64 = steamIdentity;
    } else {
        const apiKey = process.env.STEAM_API_KEY;
        if (!apiKey) return null;
        const urlMatch = steamIdentity.match(/steamcommunity\.com\/(?:id|profiles)\/([^/]+)/);
        if (!urlMatch || !urlMatch[1]) return null;
        const vanityOrId = urlMatch[1];
        try {
            const apiUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityOrId}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.response && data.response.success === 1 && data.response.steamid) {
                steamID64 = data.response.steamid;
            } else {
                return null;
            }
        } catch { return null; }
    }
    return 'steam:' + BigInt(steamID64).toString(16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-kayit')
        .setDescription('Whitelist kayıt sistemi.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addUserOption(option => option.setName('kullanici').setDescription('Kaydedilecek Discord kullanıcısı').setRequired(true))
        .addStringOption(option => option.setName('steam-link').setDescription('Kullanıcının Steam profil linki').setRequired(true))
        .addStringOption(option => option.setName('fivem-saati').setDescription('Kullanıcının FiveM oynama süresi (örn: 11 saat)').setRequired(false)),
    async execute(interaction, client) {
        // Komutun herkese açık bir yanıt vermesi için deferReply'ı flags olmadan çağırıyoruz.
        await interaction.deferReply();

        const member = interaction.options.getMember('kullanici');
        const steamLink = interaction.options.getString('steam-link');
        const fivemSaati = interaction.options.getString('fivem-saati') || 'Bilinmiyor'; 
        const staff = interaction.member;

        // ANAHTAR DÜZELTME: Veritabanından doğru anahtarla çekiyoruz
        const kayitliRolId = (await Settings.findOne({ where: { key: 'wl-kayitli-rol' } }))?.value;
        const kayitsizRolId = (await Settings.findOne({ where: { key: 'wl-kayitsiz-rol' } }))?.value;
        const logChannelId = (await Settings.findOne({ where: { key: 'kayitLog' } }))?.value;

        if (!kayitliRolId) {
            await interaction.editReply({ content: 'Kayıtlı rolü ayarlanmamış! Lütfen önce `/ayarlar wl-kayitli-rol` komutu ile ayarlayın.', flags: MessageFlags.Ephemeral });
            return; // Hata durumunda işlemi durdur
        }

        // Rolleri ayarla
        if (kayitsizRolId) {
            try {
                await member.roles.remove(kayitsizRolId);
            } catch (error) {
                console.error(`Kayitsiz rolü kaldırılırken hata: ${error.message}`);
                // Hata olsa bile işleme devam edilebilir, opsiyonel bir rol.
            }
        }
        try {
            await member.roles.add(kayitliRolId);
        } catch (error) {
            console.error(`Kayitli rolü verilirken hata: ${error.message}`);
            await interaction.editReply({ content: 'Kayıtlı rolü verilirken bir hata oluştu. Botun rol hiyerarşisini kontrol edin.', flags: MessageFlags.Ephemeral });
            return; // Kritik hata, işlemi durdur
        }

        // İstatistik için veritabanına kaydet
        await Registrations.create({
            staffId: staff.id,
            registeredUserId: member.id,
            guildId: interaction.guild.id,
        });

        // Yetkilinin toplam kayıt sayısını al
        const totalRegistrations = await Registrations.count({
            where: { staffId: staff.id }
        });

        // Yetkilinin baktığı toplam ticket sayısını al (Tickets modelinden çekiyoruz)
        // Bu, Ticket modelinde 'claimedBy' alanı varsa çalışır.
        const totalTicketsClaimed = await Tickets.count({
            where: { claimedBy: staff.id }
        });

        const steamHex = await getSteamHex(steamLink) || 'Hesaplanamadı';

        // Görseldeki gibi zengin bir Embed mesajı oluştur
        const embed = new EmbedBuilder()
            .setColor('#2ECC71') // Yeşil renk teması
            .setAuthor({ name: 'Holy Roleplay | UYG', iconURL: interaction.guild.iconURL() }) // Sunucu ikonu
            .setTitle('YENİ KAYIT İŞLEMİ')
            .setDescription('KAYIT İŞLEMİ BAŞARILI!')
            .addFields(
                { name: 'KULLANICI', value: member.toString(), inline: true },
                { name: 'STEAM PROFIL', value: `[Link](${steamLink})`, inline: true },
                { name: 'HEX ID', value: `\`${steamHex}\``, inline: true },
                { name: 'FIVEM SAATI', value: fivemSaati, inline: true }, // Manuel girilen FiveM Saati
                { name: 'KAYIT YAPAN YETKİLİ', value: staff.toString(), inline: true },
                { name: 'YETKİLİ İSTATİSTİKLERİ', value: `Toplam Kayıt: \`${totalRegistrations}\`\nToplam Ticket: \`${totalTicketsClaimed}\``, inline: true }
            )
            .setFooter({ text: `KAYIT LOGU • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
            .setTimestamp();

        // Mesajı herkese açık olarak gönder
        await interaction.editReply({ embeds: [embed] });

        // Kayıt log kanalına da aynı embed'i gönder
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                // Log kanalına gönderilen embed'e farklı bir footer ekleyebiliriz veya aynı kalabilir
                const logEmbed = EmbedBuilder.from(embed)
                    .setFooter({ text: `WL Kayıt Logu | ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` });
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Yetkiliye özel, ephemeral bir onay mesajı gönder
        await interaction.followUp({ content: `✅ **${member.user.tag}** adlı kullanıcı başarıyla kaydedildi ve herkese açık log gönderildi.`, flags: MessageFlags.Ephemeral });
    },
};
