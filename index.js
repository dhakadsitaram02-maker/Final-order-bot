const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Collection,
  Events
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
const activeOrders = new Map(); // channelId → { step, cart }

// ===== Items List =====
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
  { name: "Security/Anti-Spam Setup", price: 5 },
];

// ===== Ready =====
client.once("ready", async () => {
  console.log(`${client.user.tag} is online ✅`);

  // Register /order command
  const data = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start the order process (Staff only)."),
  ].map(cmd => cmd.toJSON());

  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set(data);
    console.log("Slash commands registered ✅");
  }
});

// ===== Interaction Handling =====
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash Command
    if (interaction.isChatInputCommand() && interaction.commandName === "order") {
      await interaction.deferReply({ ephemeral: true });

      // Ticket category check
      if (interaction.channel.parentId !== config.TICKET_CATEGORY) {
        return await interaction.editReply({
          content: "❌ Ye command sirf ticket channel me hi use ho sakti hai.",
        });
      }

      // Staff role check
      if (!interaction.member.roles.cache.some(r => config.STAFF_ROLE_IDS.includes(r.id))) {
        return await interaction.editReply({
          content: "❌ Sirf staff ya owner hi order bana sakte hain.",
        });
      }

      // Start order
      activeOrders.set(interaction.channel.id, { step: 0, cart: [] });

      await showItem(interaction, 0, true);
    }

    // Buttons
    if (interaction.isButton()) {
      const order = activeOrders.get(interaction.channel.id);
      if (!order) return;

      const [action, index] = interaction.customId.split("_");

      if (action === "add") {
        order.cart.push(items[order.step]);
        order.step++;
        if (order.step < items.length) {
          await showItem(interaction, order.step, false);
        } else {
          await showSummary(interaction, order.cart);
        }
      } else if (action === "skip") {
        order.step++;
        if (order.step < items.length) {
          await showItem(interaction, order.step, false);
        } else {
          await showSummary(interaction, order.cart);
        }
      } else if (action === "confirm") {
        const logChannel = interaction.guild.channels.cache.get(config.ORDER_LOGS_CHANNEL);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("📦 New Order Confirmed")
            .setDescription(order.cart.map(i => `• ${i.name} - $${i.price} (₹${i.price * 85})`).join("\n"))
            .addFields({ name: "Customer", value: `<@${interaction.user.id}>` })
            .addFields({
              name: "Total",
              value: `$${order.cart.reduce((a, b) => a + b.price, 0)} (₹${order.cart.reduce((a, b) => a + b.price, 0) * 85})`,
            })
            .setColor("Green");

          await logChannel.send({ embeds: [embed] });
        }
        await interaction.update({ content: "✅ Order confirm ho gaya!", embeds: [], components: [] });
        activeOrders.delete(interaction.channel.id);
      }
    }
  } catch (err) {
    console.error("Order command error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "⚠️ Kuch galat ho gaya, try again." });
    } else {
      await interaction.reply({ content: "⚠️ Kuch galat ho gaya, try again.", ephemeral: true });
    }
  }
});

// ===== Show Item =====
async function showItem(interaction, step, fresh) {
  const item = items[step];
  if (!item) {
    return await showSummary(interaction, activeOrders.get(interaction.channel.id).cart);
  }

  const embed = new EmbedBuilder()
    .setTitle(`🛒 Item ${step + 1}`)
    .setDescription(`${item.name} - $${item.price} (₹${item.price * 85})`)
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_${step}`)
      .setLabel("Add to Cart")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("skip")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary)
  );

  if (fresh) {
    await interaction.editReply({ embeds: [embed], components: [row] });
  } else {
    await interaction.update({ embeds: [embed], components: [row] });
  }
}

// ===== Show Summary =====
async function showSummary(interaction, cart) {
  if (!cart.length) {
    return await interaction.update({
      content: "🛒 Tumhari cart empty hai.",
      embeds: [],
      components: []
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🛍️ Order Summary")
    .setDescription(cart.map((c, i) => `${i + 1}. ${c.name} - $${c.price} (₹${c.price * 85})`).join("\n"))
    .setColor("Green");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel("Confirm Order")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.update({ embeds: [embed], components: [row], content: "" });
}

// ===== Login =====
client.login(process.env.TOKEN);
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
