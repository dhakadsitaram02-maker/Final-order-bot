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
const activeOrders = new Map();

// ====== READY ======
client.once("ready", async () => {
  console.log(`${client.user.tag} is online ✅`);

  const data = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start the order process (Staff only)."),
  ].map((cmd) => cmd.toJSON());

  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set(data);
    console.log("Slash commands registered ✅");
  }
});

// ====== /order command ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "order") {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Ticket category check
      if (interaction.channel.parentId !== config.TICKET_CATEGORY) {
        return await interaction.editReply({
          content: "❌ Ye command sirf ticket channel me hi use ho sakti hai.",
        });
      }

      // Staff role check
      if (
        !interaction.member.roles.cache.some((r) =>
          config.STAFF_ROLE_IDS.includes(r.id)
        )
      ) {
        return await interaction.editReply({
          content: "❌ Sirf staff ya owner hi order bana sakte hain.",
        });
      }

      // Start order
      activeOrders.set(interaction.channel.id, { step: 0, cart: [] });

      // First item show
      await showItem(interaction, 0, true);
    } catch (err) {
      console.error("Order command error:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "⚠️ Kuch galat ho gaya, try again.",
        });
      } else {
        await interaction.reply({
          content: "⚠️ Kuch galat ho gaya, try again.",
          ephemeral: true,
        });
      }
    }
  }
});

// ====== BUTTON HANDLER ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const order = activeOrders.get(interaction.channel.id);
  if (!order) return;

  if (interaction.customId.startsWith("add_")) {
    const step = parseInt(interaction.customId.split("_")[1]);
    const allServices = config.items.flatMap((g) => g.services);
    const item = allServices[step];
    if (item) order.cart.push(item);

    order.step++;
    await showItem(interaction, order.step, false);
  } else if (interaction.customId.startsWith("skip_")) {
    order.step++;
    await showItem(interaction, order.step, false);
  } else if (interaction.customId === "confirm") {
    const logChannel = interaction.guild.channels.cache.get(
      config.ORDER_LOGS_CHANNEL
    );
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("📦 New Order Confirmed")
        .setDescription(
          order.cart
            .map(
              (i) =>
                `• ${i.name} - ${i.price}${config.currency[0]} (${i.inr}₹)`
            )
            .join("\n")
        )
        .addFields({ name: "Customer", value: `<@${interaction.user.id}>` })
        .addFields({
          name: "Total",
          value: `${order.cart.reduce((a, b) => a + b.price, 0)}${
            config.currency[0]
          } (${order.cart.reduce((a, b) => a + b.price, 0) * 85}₹)`,
        })
        .setColor("Green");

      await logChannel.send({ embeds: [embed] });
    }

    await interaction.update({
      content: "✅ Order confirm ho gaya!",
      embeds: [],
      components: [],
    });
    activeOrders.delete(interaction.channel.id);
  }
});

// ====== SHOW ITEM (step by step) ======
async function showItem(interaction, step, fresh = false) {
  const allServices = config.items.flatMap((g) => g.services);
  const service = allServices[step];

  if (!service) {
    return await showSummary(interaction, activeOrders.get(interaction.channel.id).cart);
  }

  const embed = new EmbedBuilder()
    .setTitle(`🛠️ ${service.name}`)
    .setDescription(
      `Price: ${service.price}${config.currency[0]} (${service.inr}₹)`
    )
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_${step}`)
      .setLabel("Add to Cart")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`skip_${step}`)
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary)
  );

  if (fresh) {
    await interaction.editReply({ embeds: [embed], components: [row] });
  } else {
    await interaction.update({ embeds: [embed], components: [row] });
  }
}

// ====== SHOW SUMMARY ======
async function showSummary(interaction, cart) {
  if (!cart.length) {
    return await interaction.update({
      content: "🛒 Tumhari cart empty hai, koi order confirm nahi hua.",
      embeds: [],
      components: [],
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🛍️ Order Summary")
    .setDescription(
      cart
        .map(
          (c, i) =>
            `${i + 1}. ${c.name} - ${c.price}${config.currency[0]} (${c.inr}₹)`
        )
        .join("\n")
    )
    .setColor("Green");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel("Confirm Order")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

// ====== LOGIN ======
client.login(process.env.TOKEN);
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web service running on port ${PORT}`);
});
