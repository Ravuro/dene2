// events/interactionCreate.js
const { EmbedBuilder, MessageFlags, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, ApplicationCommandType } = require('discord.js');
const { Op } = require('sequelize');
const { Settings, Tickets, TicketCategories, TicketRatings } = require('../database');
const kurulumCommand = require('../commands/yonetim/kurulum');
const rolKurulumCommand = require('../commands/yonetim/rol-kurulum');
const { setupItems, checkSetup } = kurulumCommand;

/**
 * IC İsim başvurusu butonlarını yönetir.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleIcIsimButtons(interaction, client) {
    if (!interaction.customId.startsWith('ic_isim')) return;
    
    const [action, subAction, targetId, isim] = interaction.customId.split('-');

    if (interaction.user.id === targetId) {
        return interaction.reply({ content: 'Kendi başvurunuzu değerlendiremezsiniz.', flags: MessageFlags.Ephemeral });
    }

    const kayitYetkiliRolId = (await Settings.findOne({ where: { key: 'kayit-yetkili-rol' } }))?.value;
    const requiredRoles = Array.isArray(kayitYetkiliRolId) ? kayitYetkiliRolId : [kayitYetkiliRolId];
    const hasPermission = interaction.member.roles.cache.some(role => requiredRoles.includes(role.id));

    if (!hasPermission) {
        return interaction.reply({ content: 'Bu işlemi yapmak için "Kayıt Yetkilisi" rolüne sahip olmalısınız.', flags: MessageFlags.Ephemeral });
    }

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
        await interaction.update({ content: 'Kullanıcı sunucuda bulunamadı veya ayrıldı. Başvuru silindi.', embeds: [], components: [] });
        return;
    }

    const icIsimLogChannelId = (await Settings.findOne({ where: { key: 'icIsimLog' } }))?.value;
    let logChannel = null;
    if (icIsimLogChannelId) {
        logChannel = await client.channels.fetch(icIsimLogChannelId).catch(() => null);
    }

    if (subAction === 'onayla') {
        await interaction.deferUpdate();
        const onayRolId = (await Settings.findOne({ where: { key: 'icIsimRole' } }))?.value;
        if (onayRolId) {
            const rol = interaction.guild.roles.cache.get(onayRolId);
            if (rol) await targetMember.roles.add(rol).catch(console.error);
        }
        await targetMember.setNickname(isim, 'IC İsim başvurusu onaylandı.').catch(console.error);
        
        // Orijinal başvuru mesajını güncelle
        await interaction.message.edit({ content: `✅ **${interaction.user.tag}** tarafından onaylandı.`, embeds: [], components: [] });
        
        // Kullanıcıya DM gönder
        await targetMember.send(`Tebrikler! **${interaction.guild.name}** sunucusundaki \`${isim}\` isimli başvurunuz onaylandı.`).catch(() => {});

        // Loglama
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#2ECC71') // Yeşil
                .setTitle('IC İsim Başvurusu Onaylandı')
                .addFields(
                    { name: 'Başvuran', value: targetMember.toString(), inline: true },
                    { name: 'Onaylayan Yetkili', value: interaction.user.toString(), inline: true },
                    { name: 'Talep Edilen İsim', value: `\`${isim}\``, inline: false }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

        // KANAL İZİN MANTIĞI BURADA BAŞLIYOR (Kanalı silmek yerine izinleri düzenle)
        const icIsimApplicationChannelId = (await Settings.findOne({ where: { key: 'icIsimChannel' } }))?.value;
        if (icIsimApplicationChannelId && interaction.channel.id === icIsimApplicationChannelId) {
            try {
                // @everyone rolünün kanalı görmesini engelle
                await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                    ViewChannel: false,
                });
                // Başvuran kullanıcının kanalı görmesini engelle
                await interaction.channel.permissionOverwrites.edit(targetMember.id, {
                    ViewChannel: false,
                });
                // Kayıt yetkilisi rolünün kanalı görmeye devam etmesini sağla
                if (kayitYetkiliRolId) {
                    const staffRole = interaction.guild.roles.cache.get(kayitYetkiliRolId);
                    if (staffRole) {
                        await interaction.channel.permissionOverwrites.edit(staffRole.id, {
                            ViewChannel: true,
                        });
                    }
                }
                await interaction.channel.send('Başvuru onaylandı. Bu kanal artık başvuru sahibi ve diğer üyeler tarafından görülemeyecektir.').catch(console.error);
            } catch (error) {
                console.error('IC İsim kanalı izinleri güncellenirken hata:', error);
                await interaction.channel.send('Kanal izinleri güncellenirken bir hata oluştu. Lütfen manuel olarak kontrol edin.').catch(console.error);
            }
        }

    } else if (subAction === 'reddet') {
        // Reddetme modalını göster
        const modal = new ModalBuilder()
            .setCustomId(`ic_isim-reddet-modal-${targetId}-${isim}`) // Modal Custom ID'si
            .setTitle('IC İsim Başvurusunu Reddet');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reddet_sebep')
            .setLabel('Reddetme Sebebi')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }
}

/**
 * IC İsim başvurusu reddetme modal submit işlemini yönetir.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleIcIsimModalSubmit(interaction, client) {
    // Hem butonla tetiklenen modalı hem de context menüden tetiklenen modalı yakala
    if (!interaction.customId.startsWith('ic_isim-reddet-modal') && !interaction.customId.startsWith('context_ic_isim-reddet-modal')) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parts = interaction.customId.split('-');
    let targetId, isim, isContextCommand = false;

    if (interaction.customId.startsWith('context_ic_isim-reddet-modal')) {
        // Context menüden gelen modal
        targetId = parts[parts.length - 2]; // Kullanıcı ID'si
        isim = decodeURIComponent(parts[parts.length - 1]); // Mesaj içeriği (decode edildi)
        isContextCommand = true;
    } else {
        // Normal butonla gelen modal
        targetId = parts[parts.length - 2]; // Sondan ikinci kısım kullanıcı ID'si
        isim = parts[parts.length - 1]; // Son kısım isim
    }

    const reason = interaction.fields.getTextInputValue('reddet_sebep');

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
        await interaction.editReply({ content: 'Kullanıcı sunucuda bulunamadı veya ayrıldı. Başvuru zaten silinmiş olabilir.', flags: MessageFlags.Ephemeral });
        return;
    }

    // Eğer normal bir başvuru mesajından geliyorsa orijinal mesajı güncelle
    // Context menüden gelen etkileşimlerde orijinal bir başvuru mesajı yoktur.
    if (!isContextCommand) {
        const originalMessage = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
        if (originalMessage) {
            await originalMessage.edit({ content: `❌ **${interaction.user.tag}** tarafından reddedildi.\n**Sebep:** ${reason}`, embeds: [], components: [] });
        }
    }

    await targetMember.send(`Üzgünüz, **${interaction.guild.name}** sunucusundaki \`${isim}\` isimli başvurunuz reddedildi.\n**Sebep:** ${reason}`).catch(() => {});
    await interaction.editReply('Başvuru başarıyla reddedildi ve kullanıcıya bilgi verildi.');

    // Loglama
    const icIsimLogChannelId = (await Settings.findOne({ where: { key: 'icIsimLog' } }))?.value;
    if (icIsimLogChannelId) {
        const logChannel = await client.channels.fetch(icIsimLogChannelId).catch(() => null);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#E74C3C') // Kırmızı
                .setTitle(`IC İsim Başvurusu Reddedildi (${isContextCommand ? 'Bağlam Menüsü' : 'Buton'})`) // Log başlığını güncelledik
                .addFields(
                    { name: 'Başvuran', value: targetMember.toString(), inline: true },
                    { name: 'Reddeden Yetkili', value: interaction.user.toString(), inline: true },
                    { name: 'Talep Edilen İsim', value: `\`${isim}\``, inline: false },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    // KANAL İZİN MANTIĞI BURADA BAŞLIYOR (Reddetme için de geçerli)
    // Sadece IC İsim başvuru kanalından gelen etkileşimler için kanal izinlerini düzenle
    const icIsimApplicationChannelId = (await Settings.findOne({ where: { key: 'icIsimChannel' } }))?.value;
    // Eğer etkileşim bir buton üzerinden geldiyse ve IC isim başvuru kanalındaysa izinleri düzenle
    if (!isContextCommand && icIsimApplicationChannelId && interaction.channel.id === icIsimApplicationChannelId) {
        try {
            const kayitYetkiliRolId = (await Settings.findOne({ where: { key: 'kayit-yetkili-rol' } }))?.value;
            // @everyone rolünün kanalı görmesini engelle
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                ViewChannel: false,
            });
            // Başvuran kullanıcının kanalı görmesini engelle
            await interaction.channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: false,
            });
            // Kayıt yetkilisi rolünün kanalı görmeye devam etmesini sağla
            if (kayitYetkiliRolId) {
                const staffRole = interaction.guild.roles.cache.get(kayitYetkiliRolId);
                if (staffRole) {
                    await interaction.channel.permissionOverwrites.edit(staffRole.id, {
                        ViewChannel: true,
                    });
                }
            }
            await interaction.channel.send('Başvuru reddedildi. Bu kanal artık başvuru sahibi ve diğer üyeler tarafından görülemeyecektir.').catch(console.error);
        } catch (error) {
            console.error('IC İsim kanalı izinleri güncellenirken hata:', error);
            await interaction.channel.send('Kanal izinleri güncellenirken bir hata oluştu. Lütfen manuel olarak kontrol edin.').catch(console.error);
        }
    }
}


/**
 * Kurulum paneli butonlarını yönetir.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleKurulumButtons(interaction) {
    if (!interaction.customId.startsWith('kurulum_')) return;
    await interaction.deferUpdate();

    const action = interaction.customId.split('_')[1];
    const guild = interaction.guild;

    if (action === 'sifirla') {
        const keysToDestroy = setupItems.map(item => item.key).concat(setupItems.filter(k => k.statusKey).map(k => k.statusKey));
        const settingsToDelete = await Settings.findAll({ where: { key: keysToDestroy } });
        for (const setting of settingsToDelete) {
            try {
                const itemInfo = setupItems.find(item => item.key === setting.key);
                if (itemInfo?.type === 'channel') {
                    const channel = await guild.channels.fetch(setting.value).catch(() => null);
                    if (channel) await channel.delete('Kurulum sıfırlandı.');
                } else if (itemInfo?.type === 'role') {
                    const role = await guild.roles.fetch(setting.value).catch(() => null);
                    if (role && role.editable) await role.delete('Kurulum sıfırlandı.');
                }
            } catch (error) {
                console.error(`Sıfırlama sırasında varlık silinemedi (ID: ${setting.value}):`, error);
            }
        }
        await Settings.destroy({ where: { key: keysToDestroy } });
        await interaction.followUp({ content: 'Tüm ayarlar, ilgili kanallar ve roller başarıyla sıfırlandı!', flags: MessageFlags.Ephemeral });
    } else if (action === 'kanallar') {
        const channelsToSetup = setupItems.filter(item => item.type === 'channel');
        let logCategory = guild.channels.cache.find(c => c.name === 'MODERASYON' && c.type === ChannelType.GuildCategory);
        if (!logCategory) {
            logCategory = await guild.channels.create({ name: 'MODERASYON', type: ChannelType.GuildCategory, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }] });
        }
        for (const item of channelsToSetup) {
            const setting = await Settings.findOne({ where: { key: item.key } });
            if (setting && !guild.channels.cache.has(setting.value)) await setting.destroy();
            const existing = await Settings.findOne({ where: { key: item.key } });
            if (!existing) {
                const newChannel = await guild.channels.create({ name: `${item.icon}・${item.name}`, type: ChannelType.GuildText, parent: logCategory.id });
                await Settings.upsert({ key: item.key, value: newChannel.id });
                if (item.statusKey) await Settings.upsert({ key: item.statusKey, value: true });
            }
        }
        await interaction.followUp({ content: 'Tüm eksik log kanalları başarıyla oluşturuldu ve ilgili sistemler aktif edildi!', flags: MessageFlags.Ephemeral });
    } else if (action === 'roller') {
        const rolesToSetup = setupItems.filter(item => item.type === 'role');
        for (const item of rolesToSetup) {
             const setting = await Settings.findOne({ where: { key: item.key } });
             if (setting && !guild.roles.cache.has(setting.value)) await setting.destroy();
             const existing = await Settings.findOne({ where: { key: item.key } });
             if (!existing) {
                 const newRole = await guild.roles.create({ name: item.name, mentionable: true });
                 await Settings.upsert({ key: item.key, value: newRole.id });
                 if (item.key === 'otorolRole') await Settings.upsert({ key: 'otorolStatus', value: true });
             }
        }
        await interaction.followUp({ content: 'Tüm eksik temel roller başarıyla oluşturuldu ve ayarlandı!', flags: MessageFlags.Ephemeral });
    }

    const currentStatus = await checkSetup();
    const newEmbed = new EmbedBuilder()
        .setTitle('🤖 Bot Kurulum Yardımcısı (Güncellendi)')
        .setColor(action === 'sifirla' ? '#E74C3C' : '#2ECC71')
        .setDescription('İşlem tamamlandı. Mevcut durum aşağıdadır.')
        .addFields(setupItems.map(item => ({ name: `${item.icon || ''} ${item.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, value: currentStatus[item.key], inline: true })));
    await interaction.editReply({ embeds: [newEmbed], components: interaction.message.components });
}

/**
 * Gelişmiş Ticket sistemi butonlarını ve modalları yönetir.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleTicketInteractions(interaction) {
    if (!interaction.customId?.startsWith('ticket_')) return;

    const [type, action, ...params] = interaction.customId.split('_');

    if (interaction.isButton() && action === 'create') {
        const categoryId = params[0];
        const category = await TicketCategories.findByPk(categoryId);
        if (!category) return interaction.reply({ content: 'Bu kategori artık mevcut değil.', flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const user = interaction.user;
        
        let openTicket = await Tickets.findOne({ where: { userId: user.id, status: { [Op.ne]: 'closed' } } });
        if (openTicket) {
            const channelExists = interaction.guild.channels.cache.has(openTicket.channelId);
            if (channelExists) return interaction.editReply(`Zaten açık bir destek talebiniz bulunuyor: <#${openTicket.channelId}>`);
            else await openTicket.destroy();
        }
        
        const ticketChannel = await interaction.guild.channels.create({
            name: `${category.name.toLowerCase().replace(/ /g, '-')}-${user.username}`, type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: category.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });

        const ticket = await Tickets.create({ channelId: ticketChannel.id, userId: user.id, guildId: interaction.guild.id, categoryId: category.categoryId });
        
        const embed = new EmbedBuilder()
            .setTitle(`${category.name} Talebi`).setColor('#2ECC71').setFooter({ text: `Ticket ID: ${ticket.channelId} | Durum: Açık` })
            .setDescription(`Hoş geldiniz, ${user}! Lütfen sorununuzu detaylıca açıklayın. **${category.name}** ekibi en kısa sürede size yardımcı olacaktır.`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Kapat').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Üstlen').setStyle(ButtonStyle.Primary)
        );
        await ticketChannel.send({ content: `<@&${category.supportRoleId}>, yeni bir **${category.name}** talebi var!`, embeds: [embed], components: [row] });
        await interaction.editReply(`Destek talebiniz başarıyla oluşturuldu: ${ticketChannel}`);
        return;
    }

    if (interaction.isButton() && action === 'rate') {
        const rating = parseInt(params[0]);
        const ticketId = params[1];
        const originalTicket = await Tickets.findOne({ where: { channelId: ticketId } });
        if (!originalTicket) {
            return interaction.update({ content: 'Bu değerlendirme artık geçerli değil veya bir hata oluştu.', components: [] });
        }
        await TicketRatings.create({ ticketId: ticketId, userId: interaction.user.id, rating: rating, staffId: originalTicket.claimedBy });
        await interaction.update({ content: `Değerlendirmeniz için teşekkür ederiz! **${rating}** puan verdiniz.`, components: [] });
        return;
    }

    const ticket = await Tickets.findOne({ where: { channelId: interaction.channel.id } });
    if (!ticket) return;

    if (interaction.isButton()) {
        const category = await TicketCategories.findByPk(ticket.categoryId);
        const supportRoleId = category?.supportRoleId;
        // Eğer supportRoleId bir dizi ise, yetki kontrolünü ona göre yap
        const requiredRoles = Array.isArray(supportRoleId) ? supportRoleId : [supportRoleId];
        const hasPermission = interaction.member.roles.cache.some(role => requiredRoles.includes(role.id));

        if (!hasPermission) {
             return interaction.reply({ content: 'Bu işlemi yapmak için ilgili Destek Ekibi rolüne sahip olmalısınız.', flags: MessageFlags.Ephemeral });
        }
        
        if (interaction.customId === 'ticket_claim') {
            await interaction.deferUpdate();
            await ticket.update({ status: 'claimed', claimedBy: interaction.user.id });
            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed).setColor('#F1C40F').setFooter({ text: `Ticket ID: ${ticket.channelId} | Durum: Bu taleple ${interaction.user.tag} ilgileniyor.` });
            const newButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Kapat').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Üstlenildi').setStyle(ButtonStyle.Primary).setDisabled(true)
            );
            await interaction.editReply({ embeds: [newEmbed], components: [newButtons] });
        }
        
        if (interaction.customId === 'ticket_close_modal') {
            const modal = new ModalBuilder().setCustomId('ticket_close_reason').setTitle('Destek Talebini Kapat');
            const reasonInput = new TextInputBuilder().setCustomId('reason').setLabel('Kapatma Sebebi').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) { // Modal submit işlemleri için genel kontrol
        // IC İsim modal submit işlemini burada ele alıyoruz
        await handleIcIsimModalSubmit(interaction, client).catch(console.error);

        if (interaction.customId === 'ticket_close_reason') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const reason = interaction.fields.getTextInputValue('reason');
            
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            const transcript = messages.reverse().map(m => `[${new Date(m.createdAt).toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');
            const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${interaction.channel.name}.txt` });

            const ticketOwner = await interaction.client.users.fetch(ticket.userId).catch(() => null);
            if (ticketOwner) {
                const ratingRow = new ActionRowBuilder().addComponents(
                    ...[1, 2, 3, 4, 5].map(star => 
                        new ButtonBuilder().setCustomId(`ticket_rate_${star}_${ticket.channelId}`).setLabel('⭐'.repeat(star)).setStyle(ButtonStyle.Primary)
                    )
                );
                try {
                    await ticketOwner.send({
                        content: `Merhaba! **${interaction.guild.name}** sunucusundaki destek talebiniz kapatılmıştır. Hizmetimizi değerlendirmek için aşağıdan puan verebilirsiniz. Konuşma kaydınız ektedir.`,
                        files: [attachment],
                        components: [ratingRow]
                    });
                } catch (dmError) { console.error(`Kullanıcıya DM gönderilemedi (ID: ${ticketOwner.id}):`, dmError); }
            }

            const ticketLogId = (await Settings.findOne({ where: { key: 'ticketLog' } }))?.value;
            if (ticketLogId) {
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#E74C3C').setTitle('Ticket Kapatıldı')
                        .addFields(
                            { name: 'Kapatan Yetkili', value: interaction.user.toString(), inline: true },
                            { name: 'Ticket Sahibi', value: ticketOwner ? ticketOwner.toString() : 'Bilinmiyor', inline: true },
                            { name: 'Sebep', value: reason }
                        ).setTimestamp();
                    const logAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${interaction.channel.name}.txt` });
                    await logChannel.send({ embeds: [logEmbed], files: [logAttachment] });
                }
            }

            await ticket.update({ status: 'closed', closeReason: reason });
            
            await interaction.editReply({ content: 'Talep başarıyla kapatıldı. Kanal 5 saniye içinde silinecektir.' });
            
            await interaction.channel.send({ content: `Bu talep **${interaction.user.tag}** tarafından kapatıldı.\n**Sebep:** ${reason}\nBu kanal 5 saniye içinde silinecektir.` });
            setTimeout(() => interaction.channel.delete('Ticket kapatıldı.').catch(console.error), 5000);
        }
    }
}

/**
 * Rol Kurulumu butonlarını yönetir.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleRolKurulumButtons(interaction) {
    if (!interaction.customId.startsWith('rolkurulum_')) return;
    await interaction.deferUpdate();

    if (interaction.customId === 'rolkurulum_iptal') {
        return interaction.editReply({ content: 'Rol kurulum işlemi iptal edildi.', embeds: [], components: [] });
    }

    if (interaction.customId === 'rolkurulum_onayla') {
        const { roleHierarchy } = rolKurulumCommand;
        const guild = interaction.guild;
        const createdRoles = new Map();
        let createdCount = 0;

        await interaction.followUp({ content: 'Rol kurulumu başlatıldı, bu işlem biraz sürebilir...', flags: MessageFlags.Ephemeral });

        for (const roleData of [...roleHierarchy].reverse()) {
            const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
            if (!existingRole) {
                const newRole = await guild.roles.create({
                    name: roleData.name,
                    color: roleData.color || '#808080',
                    permissions: [],
                    mentionable: roleData.type !== 'separator',
                });
                createdRoles.set(roleData.name, newRole.id);
                createdCount++;
            } else {
                createdRoles.set(roleData.name, existingRole.id);
            }
        }

        const permissionMap = {};
        roleHierarchy.forEach(roleData => {
            if (roleData.permissions) {
                roleData.permissions.forEach(permKey => {
                    if (!permissionMap[permKey]) {
                        permissionMap[permKey] = [];
                    }
                    const roleId = createdRoles.get(roleData.name);
                    if (roleId) {
                        permissionMap[permKey].push(roleId);
                    }
                });
            }
        });

        for (const [permKey, roleIds] of Object.entries(permissionMap)) {
            const setting = await Settings.findOne({ where: { key: permKey } });
            const existingRoleIds = setting?.value || [];
            const mergedRoleIds = [...new Set([...existingRoleIds, ...roleIds])];
            await Settings.upsert({ key: permKey, value: mergedRoleIds });
        }

        await interaction.editReply({ content: `Kurulum tamamlandı! **${createdCount}** yeni rol oluşturuldu ve tüm yetkiler bu rollere göre atandı.`, embeds: [], components: [] });
    }
}

/**
 * Komut kullanımını loglar.
 */
async function logCommandUsage(interaction) {
    try {
        const logChannelId = (await Settings.findOne({ where: { key: 'botKomutLog' } }))?.value;
        if (!logChannelId) return;
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;
        const options = interaction.options.data.map(opt => {
            let value = opt.value;
            if (opt.role) value = `<@&${opt.role.id}>`;
            if (opt.user) value = `<@${opt.user.id}>`;
            if (opt.channel) value = `<#${opt.channel.id}>`;
            return `\`${opt.name}\`: ${value}`;
        }).join('\n') || 'Yok';
        const embed = new EmbedBuilder()
            .setColor('#3498DB').setTitle('Komut Kullanıldı')
            .addFields(
                { name: 'Kullanan', value: interaction.user.toString(), inline: true },
                { name: 'Komut', value: `\`${interaction.toString()}\``, inline: true },
                { name: 'Kanal', value: interaction.channel.toString(), inline: true },
                { name: 'Parametreler', value: options, inline: false }
            ).setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error("Komut loglama sırasında hata:", error);
    }
}

// Ana olay dinleyicisi
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Bağlam menüsü komutlarını da burada işliyoruz
        if (interaction.isContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) {
                try {
                    // Context menü komutlarına client objesini de gönderiyoruz
                    await command.execute(interaction, client);
                    await logCommandUsage(interaction); // Bağlam menüsü komutlarını da logla
                } catch (error) {
                    console.error(`Bağlam menüsü komutu yürütülürken hata oluştu: ${interaction.commandName}`, error);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000').setTitle('Bir Hata Oluştu!')
                        .setDescription('Bu komutu çalıştırırken beklenmedik bir sorunla karşılaşıldı.')
                        .setTimestamp();
                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                        }
                    } catch (replyError) {
                        console.error('Hata mesajı gönderilemedi:', replyError);
                    }
                }
            }
            return;
        }

        if (interaction.isButton()) {
            await handleIcIsimButtons(interaction, client).catch(console.error); // Client objesini de gönderiyoruz
            await handleKurulumButtons(interaction).catch(console.error);
            await handleTicketInteractions(interaction, client).catch(console.error); // Client objesini de gönderiyoruz
            await handleRolKurulumButtons(interaction).catch(console.error);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleIcIsimModalSubmit(interaction, client).catch(console.error); // Client objesini de gönderiyoruz
            await handleTicketInteractions(interaction, client).catch(console.error); // Client objesini de gönderiyoruz
            return;
        }

        if (!interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
            await logCommandUsage(interaction);
        } catch (error) {
            console.error(`Komut yürütülürken hata oluştu: ${interaction.commandName}`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000').setTitle('Bir Hata Oluştu!')
                .setDescription('Bu komutu çalıştırırken beklenmedik bir sorunla karşılaşıldı.')
                .setTimestamp();
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }
            } catch (replyError) {
                console.error('Hata mesajı gönderilemedi:', replyError);
            }
        }
    },
};
