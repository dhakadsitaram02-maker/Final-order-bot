const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, SlashCommandBuilder, Collection } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// ========== ITEMS ==========
const items = [
  { name: "Logo Design", price: 5 },
  { name: "Server Banner", price: 5 },
  { name: "Animated Banner", price: 15 },
  { name: "Basic Server Setup", price: 5 },
  { name: "Advanced Server Setup", price: 15 },
  { name: "Reaction Roles", price: 5 },
  { name: "Ticket System", price: 5 },
  { name: "Basic Bots Setup", price: 5 },
  { name: "Custom Bot Development", price: 10 },
  { name: "Order System Setup", price: 10 },
  { name: "Auto Moderation System", price: 5 },
  { name: "Auto Announcements", price: 5 },
  { name: "Multi-language Setup", price: 10 },
  { name: "Security/Anti-Spam Setup", price: 5 }
];

// ========== COMMAND DEPLOY ==========
client.once("ready", async () => {
  console.log(`${client.user.tag} is online ✅`);

  const data = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start the order process (Staff only).")
  ].map(cmd => cmd.toJSON());

  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set(data);
    console.log("Slash commands registered ✅");
  }
});

// ========== ORDER COMMAND ==========
const activeOrders = new Map();

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ===== /order command =====
  if (interaction.isChatInputCommand() && interaction.commandName === "order") {
    await interaction.deferReply({ emphemeral : true });
    if (interaction.channel.parentId !== config.TICKET_CATEGORY) {
      return interaction.reply({ content: "❌ Ye command sirf ticket channels me use ho sakti hai.", ephemeral: true });
    }

    if (!interaction.member.roles.cache.some(r => config.STAFF_ROLE_IDS.includes(r.id)) && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: "❌ Sirf staff ya owner hi order start kar sakte hain.", ephemeral: true });
    }

    activeOrders.set(interaction.channel.id, { step: 0, cart: [] });
    showItem(interaction, 0);
  }

  // ===== Buttons =====
  if (interaction.isButton()) {
    const order = activeOrders.get(interaction.channel.id);
    if (!order) return;

    const [action, index] = interaction.customId.split("_");

    if (action === "add") {
      order.cart.push(items[index]);
      order.step++;
      if (order.step < items.length) {
        showItem(interaction, order.step, true);
      } else {
        showSummary(interaction, order.cart);
      }
    } else if (action === "skip") {
      order.step++;
      if (order.step < items.length) {
        showItem(interaction, order.step, true);
      } else {
        showSummary(interaction, order.cart);
      }
    } else if (action === "confirm") {
      const logChannel = interaction.guild.channels.cache.get(config.ORDER_LOGS_CHANNEL);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("📦 New Order Confirmed")
          .setDescription(order.cart.map(i => `• ${i.name} - $${i.price} (₹${i.price * 85})`).join("\n"))
          .addFields({ name: "Customer", value: `<@${interaction.user.id}>` })
          .addFields({ name: "Total", value: `$${order.cart.reduce((a, b) => a + b.price, 0)} (₹${order.cart.reduce((a, b) => a + b.price, 0) * 85})` })
          .setColor("Green");

        await logChannel.send({ embeds: [embed] });
      }
      await interaction.update({ content: "✅ Order confirm ho gaya!", embeds: [], components: [] });
      activeOrders.delete(interaction.channel.id);
    }
  }
});

// ===== Function to show item =====
function showItem(interaction, index, edit = false) {
  const item = items[index];
  const embed = new EmbedBuilder()
    .setTitle("🛒 Order Item")
    .setDescription(`**${item.name}**\nPrice: $${item.price} (₹${item.price * 85})`)
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`add_${index}`).setLabel("Add to Cart").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`skip_${index}`).setLabel("Skip").setStyle(ButtonStyle.Secondary)
  );

  if (edit) {
    interaction.update({ embeds: [embed], components: [row] });
  } else {
    interaction.reply({ embeds: [embed], components: [row] });
  }
}

// ===== Function to show summary =====
function showSummary(interaction, cart) {
  const total = cart.reduce((a, b) => a + b.price, 0);

  const embed = new EmbedBuilder()
    .setTitle("📝 Order Summary")
    .setDescription(cart.length > 0 ? cart.map(i => `• ${i.name} - $${i.price} (₹${i.price * 85})`).join("\n") : "❌ No items selected")
    .addFields({ name: "Total", value: `$${total} (₹${total * 85})` })
    .setColor("Gold");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("confirm").setLabel("✅ Confirm Order").setStyle(ButtonStyle.Primary)
  );

  interaction.update({ embeds: [embed], components: [row] });
}

client.login(process.env.TOKEN);
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server started on port ${PORT}`);
});
