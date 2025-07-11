// commands/yonetim/olusum.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const { Olusum, Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('olusum')
        .setDescription('Oluşum (ekip/grup) yönetimi komutları.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('ekle')
                .setDescription('Yeni bir oluşum ekler, rolünü ve kanallarını oluşturur.')
                .addStringOption(option => option.setName('isim').setDescription('Oluşumun ismi').setRequired(true))
                .addUserOption(option => option.setName('lider').setDescription('Oluşumun lideri olacak kullanıcı').setRequired(true))
                .addStringOption(option => option.setName('renk').setDescription('Oluşum rolünün rengi (örn: #FF0000 veya red)').setRequired(false))
                .addStringOption(option => option.setName('üyeler').setDescription('Ekibe eklenecek üyeler (etiketleyerek birden fazla seçin)').setRequired(false))
                .addStringOption(option => option.setName('emoji').setDescription('Kategori ve kanal isimlerinde kullanılacak emoji (örn: 💀)').setRequired(false)) // YENİ EKLENDİ
        )
        .addSubcommand(subcommand =>
            subcommand.setName('sil')
                .setDescription('Bir oluşumu rolü, kategorisi ve kanallarıyla birlikte siler.')
                .addRoleOption(option => option.setName('olusum-rolu').setDescription('Silinecek oluşumun rolü').setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName('liste').setDescription('Sunucudaki tüm oluşumları listeler.'))
        .addSubcommand(subcommand =>
            subcommand.setName('bilgi')
                .setDescription('Bir oluşumun detaylı bilgilerini gösterir.')
                .addRoleOption(option => option.setName('olusum-rolu').setDescription('Bilgisi görüntülenecek oluşumun rolü').setRequired(false))
                .addStringOption(option => option.setName('olusum-ismi').setDescription('Bilgisi görüntülenecek oluşumun ismi').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('üye-ekle')
                .setDescription('Mevcut bir ekibe üye ekler.')
                .addRoleOption(option => option.setName('olusum-rolu').setDescription('Üye eklenecek oluşumun rolü').setRequired(true))
                .addStringOption(option => option.setName('üyeler').setDescription('Ekibe eklenecek üyeler (etiketleyerek birden fazla seçin)').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('üye-çıkar')
                .setDescription('Mevcut bir ekipten üye çıkarır.')
                .addRoleOption(option => option.setName('olusum-rolu').setDescription('Üye çıkarılacak oluşumun rolü').setRequired(true))
                .addStringOption(option => option.setName('üyeler').setDescription('Ekipten çıkarılacak üyeler (etiketleyerek birden fazla seçin)').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('lider-ata')
                .setDescription('Bir oluşumun liderini değiştirir.')
                .addRoleOption(option => option.setName('olusum-rolu').setDescription('Lideri değiştirilecek oluşumun rolü').setRequired(true))
                .addUserOption(option => option.setName('yeni-lider').setDescription('Oluşumun yeni lideri olacak kullanıcı').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            if (subcommand === 'ekle') {
                const isim = interaction.options.getString('isim');
                const lider = interaction.options.getMember('lider');
                const renk = interaction.options.getString('renk') || '#3498DB'; // Varsayılan renk
                const uyelerString = interaction.options.getString('üyeler');
                const emoji = interaction.options.getString('emoji') || '💀'; // YENİ: Varsayılan kuru kafa emojisi
                const uyeIds = uyelerString ? uyelerString.match(/\d{17,19}/g) || [] : [];

                const olusumRol = await interaction.guild.roles.create({ name: isim, mentionable: true, color: renk }).catch(console.error);
                if (!olusumRol) return interaction.editReply('Rol oluşturulurken bir hata oluştu.');

                // Lideri ve diğer üyeleri role ekle
                const membersToAssign = [lider.id, ...uyeIds];
                let assignedMembers = [];
                for (const memberId of membersToAssign) {
                    const member = await interaction.guild.members.fetch(memberId).catch(() => null);
                    if (member) {
                        await member.roles.add(olusumRol).catch(console.error);
                        assignedMembers.push(member.toString());
                    }
                }
                assignedMembers = [...new Set(assignedMembers)]; // Tekrar eden üyeleri sil

                // Her oluşum için ayrı bir kategori oluştur
                const olusumKategori = await interaction.guild.channels.create({
                    name: `${emoji} ${isim}`, // Kategori adı oluşumun ismiyle ve emojiyle aynı olacak
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone göremesin
                        { id: olusumRol.id, allow: [PermissionsBitField.Flags.ViewChannel] } // Sadece oluşum rolü görebilsin
                    ],
                });

                // Kategori altına başvuru ve sohbet kanalları oluştur
                const basvuruKanal = await interaction.guild.channels.create({
                    name: `${emoji}・başvuru`, // Emoji ve isim
                    type: ChannelType.GuildText,
                    parent: olusumKategori.id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: olusumRol.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ],
                });

                const sohbetKanal = await interaction.guild.channels.create({
                    name: `${emoji}・sohbet`, // Emoji ve isim
                    type: ChannelType.GuildText,
                    parent: olusumKategori.id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: olusumRol.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ],
                });

                await Olusum.create({ 
                    name: isim, 
                    leaderId: lider.id, 
                    roleId: olusumRol.id, 
                    categoryChannelId: olusumKategori.id,
                    applicationChannelId: basvuruKanal.id,
                    chatChannelId: sohbetKanal.id,
                    emoji: emoji // YENİ: Emojiyi veritabanına kaydet
                });

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setAuthor({ name: 'ALKA - V | UYG', iconURL: interaction.guild.iconURL() })
                    .setTitle('YENİ EKİP OLUŞTURULDU')
                    .setDescription(`YENİ EKİP: <@&${olusumRol.id}> OLUŞTURULDU. PATRON: ${lider.toString()}`)
                    .addFields(
                        { name: 'EKİP ÜYELERİ:', value: assignedMembers.length > 0 ? assignedMembers.join('\n') : 'Yok', inline: false },
                        { name: 'EKİP KATEGORİSİ:', value: `<#${olusumKategori.id}>`, inline: true },
                        { name: 'BAŞVURU KANALI:', value: `<#${basvuruKanal.id}>`, inline: true },
                        { name: 'SOHBET KANALI:', value: `<#${sohbetKanal.id}>`, inline: true }
                    )
                    .setFooter({ text: `bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'sil') {
                const rol = interaction.options.getRole('olusum-rolu');
                const olusumData = await Olusum.findOne({ where: { roleId: rol.id } });
                if (!olusumData) return interaction.editReply('Bu role ait bir oluşum kaydı bulunamadı.');

                const category = await interaction.guild.channels.fetch(olusumData.categoryChannelId).catch(() => null);
                if (category && category.type === ChannelType.GuildCategory) {
                    const children = category.children.cache;
                    for (const [id, childChannel] of children) {
                        await childChannel.delete('Oluşum silindi.').catch(console.error);
                    }
                    await category.delete('Oluşum kategorisi silindi.').catch(console.error);
                }

                await rol.delete('Oluşum silindi.').catch(console.error);
                
                await olusumData.destroy();
                await interaction.editReply(`**${olusumData.name}** oluşumu başarıyla silindi. Kategori, kanallar ve rol kaldırıldı.`);

            } else if (subcommand === 'liste') {
                const olusumlar = await Olusum.findAll();
                if (olusumlar.length === 0) return interaction.editReply('Sunucuda kayıtlı hiçbir oluşum bulunmuyor.');
                const description = olusumlar.map(o => `**${o.name}** - Lider: <@${o.leaderId}> - Rol: <@&${o.roleId}>`).join('\n');
                const embed = new EmbedBuilder().setTitle('Oluşum Listesi').setDescription(description).setColor('#3498db');
                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'bilgi') {
                const rol = interaction.options.getRole('olusum-rolu');
                const isim = interaction.options.getString('olusum-ismi');
                
                let olusumData;
                if (rol) {
                    olusumData = await Olusum.findOne({ where: { roleId: rol.id } });
                } else if (isim) {
                    olusumData = await Olusum.findOne({ where: { name: isim } });
                } else {
                    return interaction.editReply('Lütfen bir oluşum rolü veya ismi belirtin.');
                }

                if (!olusumData) {
                    return interaction.editReply('Belirtilen oluşum bulunamadı.');
                }

                const leader = await interaction.guild.members.fetch(olusumData.leaderId).catch(() => null);
                const olusumRole = await interaction.guild.roles.fetch(olusumData.roleId).catch(() => null);
                
                const olusumCategory = olusumData.categoryChannelId ? await interaction.guild.channels.fetch(olusumData.categoryChannelId).catch(() => null) : null;
                const applicationChannel = olusumData.applicationChannelId ? await interaction.guild.channels.fetch(olusumData.applicationChannelId).catch(() => null) : null;
                const chatChannel = olusumData.chatChannelId ? await interaction.guild.channels.fetch(olusumData.chatChannelId).catch(() => null) : null;

                const membersWithRole = olusumRole ? olusumRole.members.map(m => m.toString()) : ['Rol bulunamadı veya üye yok.'];
                
                const infoEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setAuthor({ name: 'ALKA - V | UYG', iconURL: interaction.guild.iconURL() })
                    .setTitle(`${olusumData.name} Ekibine Ait Bilgiler:`)
                    .addFields(
                        { name: 'EKİP PATRONU:', value: leader ? leader.toString() : 'Patron bulunamadı', inline: false },
                        { name: 'EKİP ÜYELERİ:', value: membersWithRole.join('\n'), inline: false },
                        { name: 'EKİP ROLÜ:', value: olusumRole ? olusumRole.toString() : 'Rol bulunamadı', inline: true },
                        { name: 'EKİP KATEGORİSİ:', value: olusumCategory ? olusumCategory.toString() : 'Kategori bulunamadı', inline: true },
                        { name: 'BAŞVURU KANALI:', value: applicationChannel ? applicationChannel.toString() : 'Kanal bulunamadı', inline: true },
                        { name: 'SOHBET KANALI:', value: chatChannel ? chatChannel.toString() : 'Kanal bulunamadı', inline: true }
                    )
                    .setImage('https://placehold.co/600x200/000000/FFFFFF?text=EKIP+BANNERI') 
                    .setFooter({ text: `bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [infoEmbed] });

            } else if (subcommand === 'üye-ekle') {
                const rol = interaction.options.getRole('olusum-rolu');
                const uyelerString = interaction.options.getString('üyeler');
                const uyeIds = uyelerString.match(/\d{17,19}/g) || [];

                if (!rol) return interaction.editReply('Geçerli bir oluşum rolü belirtmelisiniz.');
                if (uyeIds.length === 0) return interaction.editReply('Eklenmek üzere geçerli bir üye belirtmediniz.');

                const olusumData = await Olusum.findOne({ where: { roleId: rol.id } });
                if (!olusumData) return interaction.editReply('Bu role ait bir oluşum kaydı bulunamadı.');

                let successCount = 0;
                let failCount = 0;
                let addedMembers = [];

                for (const userId of uyeIds) {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) {
                        failCount++;
                        continue;
                    }
                    if (member.roles.cache.has(rol.id)) {
                        failCount++; 
                        continue;
                    }

                    try {
                        await member.roles.add(rol);
                        successCount++;
                        addedMembers.push(member.toString());
                    } catch (err) {
                        console.error(`Üye ${member.user.tag} role eklenirken hata:`, err);
                        failCount++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 300)); 
                }

                await interaction.editReply(`**${rol.name}** ekibine üye ekleme işlemi tamamlandı.\n✅ Başarılı: **${successCount}**\n❌ Başarısız: **${failCount}**\nEklenenler: ${addedMembers.join(', ') || 'Yok'}`);

            } else if (subcommand === 'üye-çıkar') {
                const rol = interaction.options.getRole('olusum-rolu');
                const uyelerString = interaction.options.getString('üyeler');
                const uyeIds = uyelerString.match(/\d{17,19}/g) || [];

                if (!rol) return interaction.editReply('Geçerli bir oluşum rolü belirtmelisiniz.');
                if (uyeIds.length === 0) return interaction.editReply('Çıkarılmak üzere geçerli bir üye belirtmediniz.');

                const olusumData = await Olusum.findOne({ where: { roleId: rol.id } });
                if (!olusumData) return interaction.editReply('Bu role ait bir oluşum kaydı bulunamadı.');

                let successCount = 0;
                let failCount = 0;
                let removedMembers = [];

                for (const userId of uyeIds) {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) {
                        failCount++;
                        continue;
                    }
                    if (!member.roles.cache.has(rol.id)) {
                        failCount++; 
                        continue;
                    }

                    try {
                        await member.roles.remove(rol);
                        successCount++;
                        removedMembers.push(member.toString());
                    } catch (err) {
                        console.error(`Üye ${member.user.tag} rolden çıkarılırken hata:`, err);
                        failCount++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 300)); 
                }

                await interaction.editReply(`**${rol.name}** ekibinden üye çıkarma işlemi tamamlandı.\n✅ Başarılı: **${successCount}**\n❌ Başarısız: **${failCount}**\nÇıkarılanlar: ${removedMembers.join(', ') || 'Yok'}`);

            } else if (subcommand === 'lider-ata') {
                const rol = interaction.options.getRole('olusum-rolu');
                const yeniLider = interaction.options.getUser('yeni-lider');

                if (!rol) return interaction.editReply('Geçerli bir oluşum rolü belirtmelisiniz.');
                if (!yeniLider) return interaction.editReply('Yeni lider olacak kullanıcıyı belirtmelisiniz.');

                const olusumData = await Olusum.findOne({ where: { roleId: rol.id } });
                if (!olusumData) return interaction.editReply('Bu role ait bir oluşum kaydı bulunamadı.');

                const oldLeaderId = olusumData.leaderId;
                const oldLeaderMember = await interaction.guild.members.fetch(oldLeaderId).catch(() => null);
                const newLeaderMember = await interaction.guild.members.fetch(yeniLider.id).catch(() => null);

                if (!newLeaderMember) return interaction.editReply('Yeni lider sunucuda bulunamadı.');

                await olusumData.update({ leaderId: yeniLider.id });

                if (!newLeaderMember.roles.cache.has(rol.id)) {
                    await newLeaderMember.roles.add(rol).catch(console.error);
                }

                await interaction.editReply(`**${rol.name}** ekibinin lideri başarıyla ${yeniLider.toString()} olarak atandı.`);

            } 
        } catch (error) {
            console.error('Oluşum komutunda hata:', error);
            await interaction.editReply('İşlem sırasında bir hata oluştu.');
        }
    },
};
