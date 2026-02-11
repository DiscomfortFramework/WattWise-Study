const APPLIANCE_SCENARIOS = {
  dryer: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per cycle',
      condition: ({ eaec, N }) => N > 0 && eaec > 4.5,
      message: (data) => `⚠️ Your dryer used ${data.eaec.toFixed(2)} kWh this cycle — that's higher than normal. Try using a shorter or eco cycle to save energy. 💚 Health tip: Line-drying clothes in fresh air naturally sanitizes them and is better for sensitive skin!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily consumption high',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 7,
      message: (data) => `💡 You've used the dryer ${data.dailyEAEC.toFixed(1)} kWh today. That's quite a bit! Consider air drying some items to save money. 🌿 Fresh air drying reduces static and chemical exposure from dryer sheets.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Humidity spike adjustment',
      condition: ({ fH, N }) => N > 0 && fH > 1.15,
      message: (data) => `💧 High humidity is making your dryer work ${Math.round((data.fH - 1) * 100)}% harder. Wait for a drier day or use a dehumidifier to save energy. 🏠 Lower humidity also reduces mold growth and improves respiratory health!`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Multiple cycles per day',
      condition: ({ N }) => N > 2,
      message: (data) => `⚡ You've run the dryer ${data.N} times today. Try combining your laundry loads to save energy and money. 🧺 Fewer laundry sessions means less dust circulation in your home.`
    }
  ],

  kettle: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Excessive boil time',
      condition: ({ eaec, N }) => N > 0 && eaec > 0.18,
      message: (data) => `⚠️ Your kettle used ${data.eaec.toFixed(3)} kWh — that's high. Check if it needs descaling or if you're boiling too much water. ☕ Limescale buildup can release minerals into your drinks — regular descaling keeps water purer and healthier.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'High daily usage',
      condition: ({ N }) => N > 8,
      message: (data) => `☕ You've boiled the kettle ${data.N} times today. Consider boiling once and keeping water warm in a thermal flask to save energy. 💧 Staying hydrated is great! Just remember to let boiled water cool slightly before drinking to protect your throat.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Boiling too much water',
      condition: ({ eaec, duration, N }) => N > 0 && eaec > 0.15 && duration > 5,
      message: () => `💧 You're boiling more water than you need. Only fill the kettle with what you'll actually use to save energy and money. ♨️ Freshly boiled water retains more oxygen, making your tea or coffee taste better!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Cold room impact',
      condition: ({ fT, N, temperature }) => N > 0 && temperature < 10 && fT > 1.1,
      message: (data) => `❄️ Your kitchen is cold (${data.temperature}°C), so the kettle is working harder. It'll take a bit longer to boil today.`
    }
  ],

  microwave: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High power usage per session',
      condition: ({ eaec, N }) => N > 0 && eaec > 0.5,
      message: (data) => `⚠️ Your microwave used ${data.eaec.toFixed(2)} kWh this time — that's quite high. If you're defrosting, try doing it in the fridge overnight instead. 🦠 Slow fridge defrosting is safer as it prevents bacterial growth in the 'danger zone' (4-60°C).`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily usage spike',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 0.15,
      message: (data) => `🍽️ You've used the microwave a lot today (${data.dailyEAEC.toFixed(1)} kWh). Reheating multiple items together uses less energy than heating them one by one. 🥗 Quick tip: Add a damp paper towel when reheating to keep food moist and nutritious!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Inefficient use (short bursts)',
      condition: ({ shortUseCount, N }) => N > 0 && shortUseCount > 3,
      message: (data) => `⏱️ You've used the microwave ${data.shortUseCount} times in quick succession. Heating multiple items at once saves more energy than repeated short sessions. 🍲 Stirring food halfway through ensures even heating and prevents cold spots where bacteria can survive.`
    }
  ],

  coffeemachine: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per brew',
      condition: ({ eaec, N }) => N > 0 && eaec > 0.2,
      message: (data) => `⚠️ Your coffee machine used ${data.eaec.toFixed(2)} kWh for that brew — that's high. Try making a smaller cup or check if it needs descaling. ☕ Clean machines = cleaner coffee. Mineral buildup can affect flavor and add unwanted particles to your drink.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily usage high',
      condition: ({ N }) => N > 6,
      message: (data) => `☕ You've made ${data.N} coffees today. Consider making a larger pot and keeping it warm in a thermal carafe to save energy. 💚 NHS recommends limiting caffeine to 400mg/day (about 4 cups). Maybe try decaf for some of those brews?`
    }
  ],

  airfryer: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per session',
      condition: ({ eaec, N }) => N > 0 && eaec > 2.0,
      message: (data) => `⚠️ Your air fryer used ${data.eaec.toFixed(2)} kWh this time. Skip preheating if the recipe doesn't really need it — you'll save energy. 🥦 Air frying uses 70-80% less oil than deep frying, making it a heart-healthy cooking choice!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily usage high',
      condition: ({ N }) => N > 3,
      message: (data) => `🍟 You've used the air fryer ${data.N} times today. Cook multiple items together when possible to reduce the number of cooking sessions. 🌈 Batch cooking vegetables preserves more vitamins than reheating multiple times.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Room temperature high',
      condition: ({ temperature, N }) => N > 0 && temperature > 28,
      message: (data) => `🌡️ Your kitchen is warm (${data.temperature}°C). Make sure there's good airflow around the air fryer so it works efficiently. 💨 Good ventilation also helps clear cooking fumes and improves indoor air quality.`
    }
  ],

  toaster: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per session',
      condition: ({ eaec, N }) => N > 0 && eaec > 0.12,
      message: (data) => `⚠️ Your toaster used ${data.eaec.toFixed(3)} kWh. Try using a lower heat setting — your toast will still be golden but you'll save energy. 🍞 Lighter toasting creates fewer acrylamides (potentially harmful compounds formed at high heat).`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily usage high',
      condition: ({ N }) => N > 8,
      message: (data) => `🍞 You've used the toaster ${data.N} times today. Toast multiple slices at once when possible to save energy. 🌾 Whole grain bread is packed with fiber and nutrients — toast it lightly to preserve B vitamins!`
    }
  ],

  dishwasher: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per cycle',
      condition: ({ eaec, N }) => N > 0 && eaec > 3.0,
      message: (data) => `⚠️ Your dishwasher used ${data.eaec.toFixed(2)} kWh — that's quite high. Use eco mode and make sure it's fully loaded before running it. 🧼 Modern eco cycles clean just as effectively while using less water, which is better for the environment and your skin!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Partial load detected',
      condition: ({ eaec, duration, N }) => N > 0 && eaec < 1.5 && duration < 90,
      message: () => `🍽️ Running the dishwasher when it's not full wastes energy and money. Wait until you have a full load before switching it on. 🦠 Dishwashers sanitize at high temps, killing 99.9% of bacteria — much more effective than hand washing!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Hot cycle in cold conditions',
      condition: ({ eaec, temperature, N }) => N > 0 && eaec > 2.0 && temperature < 15,
      message: () => `🔥 You're using a hot wash cycle in cold weather. Switch to eco or cold wash mode to save 30-40% on energy costs. 🌡️ Most modern detergents work brilliantly at lower temps while still eliminating harmful bacteria.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Multiple daily cycles',
      condition: ({ N }) => N > 1,
      message: (data) => `🍴 You've run the dishwasher ${data.N} times today. Try saving up dishes and running it just once a day to save energy. 💧 Using a dishwasher actually saves water vs. hand washing — about 10 gallons per load!`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Peak time usage',
      condition: ({ isPeakTime, N }) => N > 0 && isPeakTime === true,
      message: () => `⏰ You're running the dishwasher during peak hours when electricity costs more. Use the delay-start feature to run it during cheaper off-peak times. 😴 Running it overnight means cleaner air quality while you sleep!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Hard water detected',
      condition: ({ fH, humidity, N }) => N > 0 && humidity > 70 && fH > 1.1,
      message: () => `💧 High humidity suggests you might be in a hard water area. Keep your rinse aid and salt topped up for better cleaning efficiency. 🍽️ Proper rinsing prevents mineral deposits on dishes, which can be ingested with food.`
    }
  ],

  washingmachine: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High energy per cycle',
      condition: ({ eaec, N }) => N > 0 && eaec > 3.0,
      message: (data) => `⚠️ Your washing machine used ${data.eaec.toFixed(2)} kWh this cycle — that's high. Switch to cold water and eco mode to save energy. 👕 Cold water washing is gentler on fabrics and reduces clothing shrinkage, making your clothes last longer!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Hot wash detected',
      condition: ({ eaec, duration, N }) => N > 0 && eaec > 2.0 && duration > 60,
      message: (data) => `🔥 Hot washes use 90% more energy than cold washes. Modern detergents work brilliantly at 30°C or even cold — try it and save money! 🌿 Lower temps preserve fabric colors and elasticity, plus they're less likely to trigger skin sensitivities.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Small load inefficiency',
      condition: ({ eaec, duration, N }) => N > 0 && eaec < 0.6 && duration < 45,
      message: (data) => `👕 You're washing a small load (${data.eaec.toFixed(2)} kWh in ${data.duration} min). Fill the machine to capacity to get the most out of each wash and save energy. 🧺 Properly filled drums provide better agitation, meaning cleaner clothes with fewer chemicals needed!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Daily usage high',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 4.0,
      message: (data) => `🧺 You've used ${data.dailyEAEC.toFixed(1)} kWh of laundry today. Try batching your laundry into fewer, fuller loads to reduce energy use. 👃 Over-washing clothes can break down fibers and reduce their protective properties against allergens.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Multiple cycles per day',
      condition: ({ N }) => N > 2,
      message: (data) => `🔄 You've run the washing machine ${data.N} times today. Combining loads when possible saves energy and money. 🌸 Less frequent washing with proper ventilation between wears reduces detergent buildup on fabrics, better for sensitive skin!`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'High spin speed',
      condition: ({ eaec, duration, N }) => N > 0 && eaec > 1.5 && duration > 90,
      message: () => `💨 Your long cycle with high spin is using extra energy. If you're line-drying anyway, reduce the spin speed to save energy. 👗 Lower spin speeds are gentler on delicate fabrics and reduce microfiber shedding into water systems.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Cold weather impact',
      condition: ({ temperature, fT, N }) => N > 0 && temperature < 15 && fT > 1.05,
      message: (data) => `❄️ The cold weather (${data.temperature}°C) means your water takes longer to heat. Use cold wash mode to avoid this extra energy use. 🧊 Cold water washing kills fewer dust mites but preserves fabric integrity — sun drying afterwards sanitizes naturally!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Peak time usage',
      condition: ({ isPeakTime, N }) => N > 0 && isPeakTime === true,
      message: () => `⏰ You're washing during peak hours when electricity is more expensive. Use the delay-start timer to wash during cheaper off-peak times. 🌙 Nighttime washing means less VOC exposure from detergents during your active hours!`
    }
  ],

  cooker: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Excessive energy per cook',
      condition: ({ eaec, N }) => N > 0 && eaec > 1.0,
      message: (data) => `⚠️ Your rice cooker used ${data.eaec.toFixed(2)} kWh — that's quite high. Check if the keep-warm function is running longer than needed. 🍚 Food kept warm for over 2 hours loses nutritional value and develops a starchy texture!`
    },
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Extended keep-warm period',
      condition: ({ keepWarmTime, N }) => N > 0 && keepWarmTime > 4,
      message: (data) => `⚠️ Your rice cooker has been keeping food warm for ${data.keepWarmTime.toFixed(1)} hours — that's using unnecessary energy. Serve the food and switch it off to save money. 🦠 Rice kept warm for 4+ hours can develop bacillus cereus bacteria — refrigerate and reheat safely instead!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Multiple cooking cycles',
      condition: ({ N }) => N > 3,
      message: (data) => `🍚 You've cooked rice ${data.N} times today. Cook larger batches and refrigerate the extra — reheating uses much less energy than cooking from scratch. ❄️ Cooled then reheated rice creates resistant starch, which is better for blood sugar control and gut health!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Daily energy consumption high',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 1.5,
      message: (data) => `💡 Your rice cooker used ${data.dailyEAEC.toFixed(1)} kWh today. Try meal prepping larger batches to reduce how often you need to cook. 🥡 Batch-cooked rice stays fresh in the fridge for 3-4 days when stored properly in airtight containers.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Cold water impact',
      condition: ({ fT, temperature, N }) => N > 0 && temperature < 15 && fT > 1.1,
      message: (data) => `❄️ Your kitchen is cold (${data.temperature}°C), so cooking takes longer. Use room-temperature water instead of cold water to reduce cooking time.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'High humidity cooking conditions',
      condition: ({ humidity, fH, N }) => N > 0 && humidity > 70 && fH > 1.05,
      message: (data) => `💧 High humidity (${data.humidity}%) may make cooking take longer. Ensure good ventilation in your kitchen. 🌬️ Good airflow prevents moisture buildup that can lead to mold growth and respiratory issues.`
    }
  ],

  xbox: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Excessive gaming session',
      condition: ({ duration, N }) => N > 0 && duration > 240,
      message: (data) => `⚠️ You've been gaming for ${(data.duration / 60).toFixed(1)} hours straight. Take a break! Your Xbox has used ${data.eaec.toFixed(2)} kWh. 👀 Extended screen time can cause eye strain and digital fatigue — follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds!`
    },
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'High daily gaming energy',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 1.5,
      message: (data) => `⚠️ Your Xbox has used ${data.dailyEAEC.toFixed(1)} kWh today — that's over 6 hours of gaming! Consider shorter sessions. 🧠 Research shows excessive gaming can affect sleep quality and posture. Balance screen time with physical activity!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Multiple long sessions',
      condition: ({ N }) => N > 4,
      message: (data) => `🎮 You've started ${data.N} gaming sessions today. Frequent breaks help reduce energy costs and improve focus. 🏃 Physical movement between sessions increases blood flow to the brain, actually improving gaming performance!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Instant-on mode detected',
      condition: ({ standbyPower, N }) => N > 0 && standbyPower > 10,
      message: (data) => `💤 Your Xbox is using ${data.standbyPower.toFixed(1)}W in instant-on mode. Switch to energy-saving mode in settings to cut standby power by 95%. 💡 Instant-on can use £40+ per year just sitting idle!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Late night gaming',
      condition: ({ lateNightHours, N }) => N > 0 && lateNightHours > 2,
      message: (data) => `🌙 You've been gaming past midnight for ${data.lateNightHours.toFixed(1)} hours. Late-night gaming affects sleep quality and uses peak electricity rates. 😴 Blue light from screens suppresses melatonin production — try gaming earlier or use night mode settings!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Warm room gaming',
      condition: ({ temperature, N }) => N > 0 && temperature > 26,
      message: (data) => `🌡️ Gaming in a warm room (${data.temperature}°C) makes your Xbox work harder and can cause overheating. Ensure good ventilation around the console. 💨 Poor ventilation reduces console lifespan and increases fan noise!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Background downloads',
      condition: ({ standbyTime, N }) => N > 0 && standbyTime > 180,
      message: (data) => `📥 Your Xbox has been downloading for ${(data.standbyTime / 60).toFixed(1)} hours. Downloads in rest mode use less power than active mode, but still add to your bill. Consider scheduling downloads overnight during cheaper electricity rates.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Peak time gaming',
      condition: ({ isPeakTime, N }) => N > 0 && isPeakTime === true,
      message: () => `⏰ You're gaming during peak electricity hours (4pm-7pm) when rates are highest. Gaming during off-peak hours (after 7pm) can save 20-30% on energy costs. ⚡ Peak time electricity can cost 28p/kWh vs 13p/kWh at night!`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Gaming posture reminder',
      condition: ({ duration, N }) => N > 0 && duration > 120,
      message: (data) => `🪑 You've been gaming for ${(data.duration / 60).toFixed(1)} hours. Remember to maintain good posture and take stretch breaks. 🤸 Prolonged sitting increases risk of back pain and repetitive strain injuries — stand, stretch, and move every hour!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Streaming vs gaming power',
      condition: ({ avgPower, N }) => N > 0 && avgPower < 50,
      message: (data) => `📺 Your Xbox is using low power (${data.avgPower.toFixed(0)}W) — looks like streaming. Streaming uses 50-80% less energy than gaming. 👁️ Remember: even passive screen time counts toward daily limits. Balance entertainment with other activities!`
    }
  ],

  waterpurifier: [
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Filter replacement overdue',
      condition: ({ filterAge, N }) => N > 0 && filterAge > 180,
      message: (data) => `⚠️ Your water purifier filter is ${data.filterAge} days old — it needs replacing! Old filters reduce purification effectiveness and increase energy use by up to 30%. 🦠 Contaminated filters can harbor bacteria and release harmful substances into your water. Replace immediately for safe drinking water!`
    },
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'Excessive daily purification',
      condition: ({ dailyEAEC, N }) => N > 0 && dailyEAEC > 2.5,
      message: (data) => `⚠️ Your water purifier used ${data.dailyEAEC.toFixed(1)} kWh today — that's unusually high. Check for leaks or continuous running issues. 💧 Over-purified water can strip beneficial minerals. If you're purifying more than needed, consider adjusting usage or checking for system faults.`
    },
    {
      level: '🟥',
      priority: 'critical',
      scenario: 'UV lamp replacement needed',
      condition: ({ uvLampAge, N }) => N > 0 && uvLampAge > 365,
      message: (data) => `⚠️ Your UV lamp is ${data.uvLampAge} days old and needs replacement! UV effectiveness drops dramatically after 1 year. 🦠 Without effective UV sterilization, harmful bacteria like E. coli and parasites may survive in your water. Replace the UV lamp immediately!`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'High energy per purification cycle',
      condition: ({ eaec, N }) => N > 0 && eaec > 0.8,
      message: (data) => `💡 Your purifier used ${data.eaec.toFixed(2)} kWh this cycle — higher than normal. This could indicate clogged filters or scaling in the system. 🔧 Regular maintenance improves efficiency and ensures your family gets clean, mineral-balanced water.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Filter change approaching',
      condition: ({ filterAge, N }) => N > 0 && filterAge > 150 && filterAge <= 180,
      message: (data) => `💡 Your water filter is ${data.filterAge} days old. Plan to replace it soon (recommended every 6 months). 🧼 As filters age, they become less effective at removing contaminants and can affect water taste and odor.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'Multiple purification cycles',
      condition: ({ N }) => N > 8,
      message: (data) => `💧 Your purifier has run ${data.N} times today. Consider purifying larger batches and storing in clean containers to reduce energy use. 🥤 Store purified water in glass or food-grade containers, and consume within 24 hours for optimal freshness.`
    },
    {
      level: '🟧',
      priority: 'warning',
      scenario: 'TDS levels abnormal',
      condition: ({ tdsLevelOut, N }) => N > 0 && (tdsLevelOut < 50 || tdsLevelOut > 150),
      message: (data) => {
        if (data.tdsLevelOut < 50) {
          return `⚠️ Your purified water TDS is very low (${data.tdsLevelOut} ppm). Water that's too pure lacks essential minerals like calcium and magnesium. 🦴 Long-term consumption of demineralized water may affect bone health. Consider a remineralization filter!`;
        } else {
          return `⚠️ Your purified water TDS is high (${data.tdsLevelOut} ppm). Filters may be saturated or malfunctioning. 🔍 High TDS after purification suggests inadequate filtration. Check and replace filters to ensure safe drinking water.`;
        }
      }
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'High input water TDS',
      condition: ({ tdsLevelIn, N }) => N > 0 && tdsLevelIn > 500,
      message: (data) => `💧 Your input water TDS is high (${data.tdsLevelIn} ppm). The purifier has to work harder, using more energy and wearing filters faster. 🏘️ High-TDS areas need more frequent filter changes (every 3-4 months instead of 6). Monitor filter performance closely.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Long purification duration',
      condition: ({ duration, N }) => N > 0 && duration > 45,
      message: (data) => `⏱️ Your purifier ran for ${data.duration} minutes — longer than usual. This could indicate low water pressure, clogged pre-filters, or membrane fouling. 🔧 Extended operation reduces efficiency and increases electricity costs. Schedule maintenance check.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Temperature impact on efficiency',
      condition: ({ temperature, N }) => N > 0 && temperature > 35,
      message: (data) => `🌡️ Room temperature is high (${data.temperature}°C). RO membranes work optimally at 20-25°C. Higher temperatures reduce efficiency and membrane life. 🧊 If possible, install your purifier in a cooler location away from direct sunlight and heat sources.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Continuous operation detected',
      condition: ({ continuousRunTime, N }) => N > 0 && continuousRunTime > 120,
      message: (data) => `⚠️ Your purifier has been running continuously for ${data.continuousRunTime} minutes. This could indicate a tank leak, faulty auto-shutoff valve, or sensor issue. 💸 Continuous operation wastes energy and water. Check for leaks and test the auto-shutoff mechanism.`
    },
    {
      level: '🟨',
      priority: 'caution',
      scenario: 'Pre-filter replacement due',
      condition: ({ preFilterAge, N }) => N > 0 && preFilterAge > 90,
      message: (data) => `🔧 Your pre-filters (sediment and carbon) are ${data.preFilterAge} days old. Replace every 3 months to protect the RO membrane. 🛡️ Pre-filters remove sediment, chlorine, and organic matter — essential for extending RO membrane life and maintaining purification quality.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Membrane replacement due',
      condition: ({ membraneAge, N }) => N > 0 && membraneAge > 730,
      message: (data) => `ℹ️ Your RO membrane is ${Math.round(data.membraneAge / 30)} months old. Most manufacturers recommend replacement every 2-3 years. 💎 A fresh membrane ensures optimal contaminant removal including heavy metals, fluoride, and dissolved salts.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Water wastage high',
      condition: ({ wasteRatio, N }) => N > 0 && wasteRatio > 3,
      message: (data) => `💧 Your purifier's waste ratio is ${data.wasteRatio.toFixed(1)}:1 (rejecting ${data.wasteRatio.toFixed(1)} liters for every 1 liter purified). Modern efficient systems waste only 2-3 liters per liter. 🌍 Consider installing a waste recovery system to use rejected water for plants or cleaning — it's safe for non-drinking purposes!`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Ideal TDS range achieved',
      condition: ({ tdsLevelOut, N }) => N > 0 && tdsLevelOut >= 80 && tdsLevelOut <= 120,
      message: (data) => `✅ Perfect! Your water TDS is ${data.tdsLevelOut} ppm — ideal for drinking. This range provides clean water while retaining beneficial minerals. 💧 Water in this range tastes better and provides essential minerals like calcium, magnesium, and potassium for daily health.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Regular maintenance reminder',
      condition: ({ daysSinceService, N }) => N > 0 && daysSinceService > 90 && daysSinceService <= 120,
      message: (data) => `🔧 It's been ${data.daysSinceService} days since your last service. Schedule a maintenance check soon to ensure optimal performance. 🧽 Regular servicing includes sanitization, which prevents biofilm buildup and ensures microbiologically safe water.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Storage tank health check',
      condition: ({ tankSanitizationAge, N }) => N > 0 && tankSanitizationAge > 60,
      message: (data) => `🧴 Your storage tank hasn't been sanitized in ${data.tankSanitizationAge} days. Clean and sanitize every 2 months to prevent bacterial growth. 🦠 Even purified water can develop biofilm in storage tanks. Monthly sanitization prevents contamination and maintains water quality.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Cold weather impact',
      condition: ({ temperature, N }) => N > 0 && temperature < 15,
      message: (data) => `❄️ Low temperature (${data.temperature}°C) can slow purification and reduce flow rate. This is normal — RO membranes work best at room temperature. ⏰ Your purifier may take 10-20% longer to fill the tank in cold conditions.`
    },
    {
      level: '🟦',
      priority: 'notice',
      scenario: 'Mineral enhancement active',
      condition: ({ hasMineralizer, tdsLevelOut, N }) => N > 0 && hasMineralizer && tdsLevelOut >= 80,
      message: (data) => `💎 Great! Your mineralizer is adding healthy minerals back to purified water (TDS: ${data.tdsLevelOut} ppm). 🦴 Remineralization adds calcium, magnesium, and trace elements that support bone health, heart function, and taste. Replace mineralizer cartridge annually.`
    }
  ]
};

// Add aliases
APPLIANCE_SCENARIOS.washing_machine = APPLIANCE_SCENARIOS.washingmachine;
APPLIANCE_SCENARIOS.gaming_console = APPLIANCE_SCENARIOS.xbox;
APPLIANCE_SCENARIOS.water_purifier = APPLIANCE_SCENARIOS.waterpurifier;

// Base energy consumption
const APPLIANCE_BASE_ENERGY = {
  dryer: 3.0,
  kettle: 0.12,
  microwave: 0.3,
  coffeemachine: 0.1,
  airfryer: 1.2,
  toaster: 0.08,
  dishwasher: 1.2,
  washingmachine: 0.9,
  washing_machine: 0.9,
  cooker: 0.25,
  xbox: 0.15,
  gaming_console: 0.15,
  waterpurifier: 0.25,
  water_purifier: 0.25
};

class EnergyCalculator {
  
  static generate(applianceKey, data) {
    const scenarios = APPLIANCE_SCENARIOS[applianceKey];
    if (!scenarios) {
      console.warn(`No scenarios found for appliance: ${applianceKey}`);
      return [];
    }

    return scenarios
      .filter(s => {
        try {
          return s.condition(data);
        } catch (error) {
          console.error(`Error evaluating condition for ${applianceKey} - ${s.scenario}:`, error);
          return false;
        }
      })
      .map(s => ({
        level: s.level,
        priority: s.priority,
        scenario: s.scenario,
        message: typeof s.message === 'function' 
          ? s.message(data) 
          : s.message
      }));
  }

  static calculateOptimization(applianceKey, temperature, humidity, pressure, usageData = {}) {
    if (!APPLIANCE_BASE_ENERGY[applianceKey]) {
      throw new Error(`Unknown appliance: ${applianceKey}`);
    }

    const fT = this.calculateTemperatureFactor(temperature, applianceKey);
    const fH = this.calculateHumidityFactor(humidity, applianceKey);
    const fP = this.calculatePressureFactor(pressure);

    const baseEnergy = APPLIANCE_BASE_ENERGY[applianceKey];
    const adjustedEnergy = baseEnergy * fT * fH * fP;
    const efficiencyLoss = Math.round((1 - (baseEnergy / adjustedEnergy)) * 100);

    const data = {
      temperature,
      humidity,
      pressure,
      fT,
      fH,
      fP,
      eaec: usageData.eaec || adjustedEnergy,
      dailyEAEC: usageData.dailyEAEC || 0,
      N: usageData.N || 0,
      duration: usageData.duration || 0,
      shortUseCount: usageData.shortUseCount || 0,
      standbyTime: usageData.standbyTime || 0,
      standbyPower: usageData.standbyPower || 0,
      avgPower: usageData.avgPower || 0,
      lateNightHours: usageData.lateNightHours || 0,
      isPeakTime: usageData.isPeakTime || false,
      keepWarmTime: usageData.keepWarmTime || 0,
      reheatCount: usageData.reheatCount || 0,
      // Water purifier specific
      filterAge: usageData.filterAge || 0,
      membraneAge: usageData.membraneAge || 0,
      uvLampAge: usageData.uvLampAge || 0,
      preFilterAge: usageData.preFilterAge || 0,
      daysSinceService: usageData.daysSinceService || 0,
      tankSanitizationAge: usageData.tankSanitizationAge || 0,
      tdsLevelIn: usageData.tdsLevelIn || 0,
      tdsLevelOut: usageData.tdsLevelOut || 0,
      wasteRatio: usageData.wasteRatio || 0,
      continuousRunTime: usageData.continuousRunTime || 0,
      hasMineralizer: usageData.hasMineralizer || false,
      ...usageData
    };

    const alerts = this.generate(applianceKey, data);
    const potentialSavings = this.calculatePotentialSavings(alerts, efficiencyLoss);
    const recommendations = this.generateRecommendations(applianceKey, temperature, humidity, alerts);

    const optimization = {
      applianceKey,
      timestamp: new Date().toISOString(),
      conditions: { 
        temperature: Math.round(temperature * 10) / 10, 
        humidity: Math.round(humidity), 
        pressure: Math.round(pressure) 
      },
      factors: { 
        fT: Math.round(fT * 100) / 100, 
        fH: Math.round(fH * 100) / 100, 
        fP: Math.round(fP * 100) / 100 
      },
      baseEnergy: Math.round(baseEnergy * 1000) / 1000,
      adjustedEnergy: Math.round(adjustedEnergy * 1000) / 1000,
      efficiencyLoss: Math.abs(efficiencyLoss),
      efficiency: Math.max(0, 100 - Math.abs(efficiencyLoss)),
      alerts,
      recommendations,
      potentialSavings,
      usageData: data
    };

    return optimization;
  }

  static generateRecommendations(applianceKey, temperature, humidity, alerts) {
    const recommendations = [];
    const normalizedKey = applianceKey.replace('_', '');

    // Xbox-specific recommendations
    if (normalizedKey === 'xbox' || normalizedKey === 'gamingconsole') {
      recommendations.push({
        type: 'efficiency',
        title: 'Use Energy-Saving Mode',
        message: 'Switch from instant-on to energy-saving mode in settings to reduce standby power by 95%',
        potentialSavings: 40,
        priority: 'high'
      });
      
      recommendations.push({
        type: 'timing',
        title: 'Game During Off-Peak Hours',
        message: 'Gaming after 7pm uses cheaper electricity rates (13p vs 28p per kWh)',
        potentialSavings: 25,
        priority: 'medium'
      });
      
      recommendations.push({
        type: 'health',
        title: 'Take Regular Breaks',
        message: 'Follow 20-20-20 rule: Every 20 min, look at something 20 feet away for 20 seconds',
        potentialSavings: 0,
        priority: 'high'
      });
      
      if (temperature > 26) {
        recommendations.push({
          type: 'ventilation',
          title: 'Improve Console Ventilation',
          message: 'Ensure Xbox has 4-6 inches clearance on all sides to prevent overheating',
          potentialSavings: 15,
          priority: 'medium'
        });
      }
    }

    // Water purifier recommendations
    if (normalizedKey === 'waterpurifier') {
      recommendations.push({
        type: 'maintenance',
        title: 'Regular Filter Changes',
        message: 'Replace filters on schedule: Pre-filters every 3 months, RO membrane every 2 years',
        potentialSavings: 30,
        priority: 'high'
      });
      
      recommendations.push({
        type: 'health',
        title: 'Monitor TDS Levels',
        message: 'Check output TDS monthly. Ideal range is 80-120 ppm for health and taste',
        potentialSavings: 0,
        priority: 'high'
      });
      
      recommendations.push({
        type: 'efficiency',
        title: 'Purify During Off-Peak Hours',
        message: 'Use timer to run purifier at night when electricity is cheaper',
        potentialSavings: 25,
        priority: 'medium'
      });
      
      recommendations.push({
        type: 'sustainability',
        title: 'Reuse Waste Water',
        message: 'Use rejected water for plants, mopping, or toilet flushing — it\'s perfectly safe',
        potentialSavings: 0,
        priority: 'medium'
      });
      
      recommendations.push({
        type: 'maintenance',
        title: 'Tank Sanitization',
        message: 'Sanitize storage tank every 2 months to prevent bacterial growth',
        potentialSavings: 0,
        priority: 'high'
      });
      
      if (temperature > 35) {
        recommendations.push({
          type: 'location',
          title: 'Cool Installation Location',
          message: 'Move purifier to cooler area. High temperatures reduce RO membrane efficiency by 15-20%',
          potentialSavings: 20,
          priority: 'medium'
        });
      }
    }

    // Environmental recommendations
    if (normalizedKey === 'dryer' && humidity > 60) {
      recommendations.push({
        type: 'timing',
        title: 'High Humidity Alert',
        message: 'Wait for lower humidity to use dryer more efficiently',
        potentialSavings: 15,
        priority: 'medium'
      });
    }

    if (normalizedKey === 'kettle' && temperature < 15) {
      recommendations.push({
        type: 'temperature',
        title: 'Cold Room Impact',
        message: 'Room temperature is low, kettle will use more energy',
        potentialSavings: 10,
        priority: 'low'
      });
    }

    if (normalizedKey === 'airfryer' && temperature > 28) {
      recommendations.push({
        type: 'ventilation',
        title: 'Ventilation Needed',
        message: 'Ensure good airflow around air fryer in warm conditions',
        potentialSavings: 5,
        priority: 'low'
      });
    }

    if (normalizedKey === 'dishwasher') {
      if (temperature < 15) {
        recommendations.push({
          type: 'temperature',
          title: 'Use Eco Mode',
          message: 'Cold water increases heating costs. Use eco/cold wash mode',
          potentialSavings: 35,
          priority: 'high'
        });
      }
      if (humidity > 70) {
        recommendations.push({
          type: 'maintenance',
          title: 'Check Salt & Rinse Aid',
          message: 'Hard water area detected. Maintain salt and rinse aid for efficiency',
          potentialSavings: 10,
          priority: 'medium'
        });
      }
    }

    if (normalizedKey === 'washingmachine') {
      if (temperature < 18) {
        recommendations.push({
          type: 'temperature',
          title: 'Cold Wash Recommended',
          message: 'Cold incoming water detected. Use 30°C or cold wash to save 90% heating energy',
          potentialSavings: 40,
          priority: 'high'
        });
      }
      recommendations.push({
        type: 'efficiency',
        title: 'Full Loads Only',
        message: 'Always wash full loads to maximize efficiency',
        potentialSavings: 25,
        priority: 'medium'
      });
    }

    if (normalizedKey === 'cooker') {
      if (temperature < 15) {
        recommendations.push({
          type: 'temperature',
          title: 'Use Room Temperature Water',
          message: 'Cold ambient temperature detected. Start with room-temp or warm water',
          potentialSavings: 15,
          priority: 'medium'
        });
      }
      recommendations.push({
        type: 'efficiency',
        title: 'Minimize Keep-Warm Time',
        message: 'Turn off keep-warm mode within 1-2 hours to save 30-40% energy',
        potentialSavings: 35,
        priority: 'high'
      });
      recommendations.push({
        type: 'batch',
        title: 'Batch Cook Rice',
        message: 'Cook larger portions and refrigerate. Reheating uses less energy than cooking',
        potentialSavings: 25,
        priority: 'medium'
      });
    }

    // Add scenario-based recommendations from alerts
    alerts.forEach(alert => {
      if (alert.priority === 'critical' || alert.priority === 'warning') {
        recommendations.push({
          type: alert.priority,
          title: alert.scenario,
          message: alert.message,
          potentialSavings: alert.priority === 'critical' ? 20 : 10,
          priority: alert.priority === 'critical' ? 'high' : 'medium'
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.potentialSavings - a.potentialSavings;
    });
  }

  static calculatePotentialSavings(alerts, efficiencyLoss) {
    let savings = Math.abs(efficiencyLoss);

    alerts.forEach(alert => {
      if (alert.priority === 'critical') savings += 20;
      else if (alert.priority === 'warning') savings += 10;
      else if (alert.priority === 'caution') savings += 5;
      else if (alert.priority === 'notice') savings += 2;
    });

    return Math.min(savings, 60);
  }

  static generateNotification(applianceKey, optimization) {
    const { alerts, potentialSavings, efficiency, recommendations } = optimization;

    const hasCritical = alerts.some(a => a.priority === 'critical');
    const hasWarning = alerts.some(a => a.priority === 'warning');

    const topAlert = alerts[0];
    const applianceName = this.getApplianceName(applianceKey);

    let notification = {
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      applianceKey,
      alerts,
      action: 'REVIEW',
      recommendations,
      timestamp: new Date().toISOString()
    };

    if (hasCritical || efficiency < 70) {
      notification.priority = 'high';
      notification.type = 'critical';
      
      if (topAlert) {
        notification.title = `${topAlert.level} ${applianceName}: Immediate Action Needed`;
        notification.message = topAlert.message;
      } else {
        notification.title = `⚠️ ${applianceName}: Poor Efficiency Detected`;
        notification.message = `Your ${applianceName.toLowerCase()} is running at only ${efficiency}% efficiency due to current conditions. This means higher energy bills. ${this.getEfficiencyAction(applianceKey, efficiency)}`;
      }
      
      notification.actionButton = 'View Details';
      notification.actionHint = 'Tap to see how to fix this';
    }
    else if (hasWarning || potentialSavings > 10) {
      notification.priority = 'medium';
      notification.type = 'opportunity';
      
      if (topAlert) {
        notification.title = `💡 ${applianceName}: Save Up to ${potentialSavings}%`;
        notification.message = `${topAlert.message}\n\nEstimated savings: ${potentialSavings}% on your energy bill.`;
      } else {
        notification.title = `💡 ${applianceName}: Energy Saving Opportunity`;
        notification.message = `You could save up to ${potentialSavings}% on ${applianceName.toLowerCase()} energy costs by adjusting your usage. ${this.getSavingsHint(applianceKey, potentialSavings)}`;
      }
      
      notification.actionButton = 'See Tips';
      notification.actionHint = 'Learn how to save energy';
    }
    else if (alerts.length > 0) {
      notification.priority = 'low';
      notification.type = 'info';
      
      if (topAlert) {
        notification.title = `ℹ️ ${applianceName} Usage Insight`;
        notification.message = topAlert.message;
      } else {
        notification.title = `ℹ️ ${applianceName} Tip`;
        notification.message = `Your ${applianceName.toLowerCase()} is working normally. ${this.getGeneralTip(applianceKey)}`;
      }
      
      notification.actionButton = 'Learn More';
      notification.actionHint = 'Optimize your usage';
    }
    else {
      notification.type = 'none';
      notification.priority = 'none';
      notification.title = `✅ ${applianceName} Running Efficiently`;
      notification.message = `Your ${applianceName.toLowerCase()} is operating at optimal efficiency (${efficiency}%). Keep it up!`;
    }

    return notification;
  }

  static getEfficiencyAction(applianceKey, efficiency) {
    const normalizedKey = applianceKey.replace('_', '');
    
    const actions = {
      dryer: 'Check if the lint filter is clean and ensure proper ventilation.',
      kettle: 'Descale your kettle and only boil the water you need.',
      microwave: 'Ensure the door seals properly and avoid running empty.',
      coffeemachine: 'Descale the machine and turn it off when not in use.',
      airfryer: 'Clean the heating element and do not overcrowd the basket.',
      toaster: 'Clean the crumb tray and check heating elements.',
      dishwasher: 'Use eco mode, ensure its fully loaded, and check the filter.',
      washingmachine: 'Use cold water wash and ensure proper load size.',
      cooker: 'Reduce keep-warm time and cook larger batches less frequently.',
      xbox: 'Enable energy-saving mode and ensure proper ventilation around console.',
      gamingconsole: 'Enable energy-saving mode and ensure proper ventilation around console.',
      waterpurifier: 'Replace all filters, check for leaks, and clean the storage tank.'
    };
    
    return actions[normalizedKey] || 'Check your appliance settings and maintenance.';
  }

  static getSavingsHint(applianceKey, savings) {
    const normalizedKey = applianceKey.replace('_', '');
    
    if (savings > 30) {
      const hints = {
        dryer: 'Switch to a lower heat setting or air-dry when possible.',
        kettle: 'Only fill what you need and descale regularly.',
        microwave: 'Defrost food in advance and use lower power settings.',
        coffeemachine: 'Brew in batches and use the keep-warm function sparingly.',
        airfryer: 'Skip preheating and cook multiple items together.',
        toaster: 'Toast multiple slices at once and use lower settings.',
        dishwasher: 'Run full loads only and use eco/cold wash cycles.',
        washingmachine: 'Always use cold water and wash full loads.',
        cooker: 'Turn off keep-warm early and batch cook for the week.',
        xbox: 'Use energy-saving mode instead of instant-on, and game during off-peak hours.',
        gamingconsole: 'Use energy-saving mode instead of instant-on, and game during off-peak hours.',
        waterpurifier: 'Use off-peak hours, reuse waste water, and maintain filters regularly.'
      };
      return hints[normalizedKey] || 'Optimize your usage patterns.';
    } else if (savings > 15) {
      return 'Small changes in how you use this appliance can add up to significant savings.';
    } else {
      return 'A few minor adjustments could help reduce your energy costs.';
    }
  }

  static getGeneralTip(applianceKey) {
    const normalizedKey = applianceKey.replace('_', '');
    
    const tips = {
      dryer: 'For best results, clean the lint filter after each use.',
      kettle: 'Boiling only what you need saves both time and energy.',
      microwave: 'Cover food to retain moisture and heat more evenly.',
      coffeemachine: 'Regular descaling keeps your machine efficient.',
      airfryer: 'Do not overcrowd the basket for even cooking.',
      toaster: 'Clean the crumb tray weekly for better performance.',
      dishwasher: 'Run full loads and use the delay start for off-peak hours.',
      washingmachine: 'Cold water cleans most clothes just as well as hot.',
      cooker: 'Cook rice in larger batches to reduce energy per serving.',
      xbox: 'Take 10-minute breaks every hour for both energy savings and health.',
      gamingconsole: 'Take 10-minute breaks every hour for both energy savings and health.',
      waterpurifier: 'Check TDS levels monthly and replace filters on schedule for optimal health.'
    };
    
    return tips[normalizedKey] || 'Regular maintenance helps keep efficiency high.';
  }

  static calculateTemperatureFactor(temperature, applianceKey) {
    const normalizedKey = applianceKey.replace('_', '');
    
    switch (normalizedKey) {
      case 'kettle':
        if (temperature < 10) return 1.15;
        if (temperature < 15) return 1.1;
        if (temperature > 25) return 0.95;
        return 1.0;
      
      case 'dryer':
        if (temperature < 15) return 1.08;
        if (temperature < 18) return 1.05;
        return 1.0;
      
      case 'airfryer':
      case 'toaster':
        if (temperature > 30) return 1.05;
        return 1.0;
      
      case 'dishwasher':
        if (temperature < 10) return 1.25;
        if (temperature < 15) return 1.18;
        if (temperature < 20) return 1.10;
        return 1.0;
      
      case 'washingmachine':
        if (temperature < 10) return 1.35;
        if (temperature < 15) return 1.25;
        if (temperature < 20) return 1.15;
        return 1.0;
      
      case 'cooker':
        if (temperature < 10) return 1.20;
        if (temperature < 15) return 1.15;
        if (temperature < 20) return 1.08;
        return 1.0;
      
      case 'xbox':
      case 'gamingconsole':
        if (temperature > 28) return 1.10;
        if (temperature > 25) return 1.05;
        return 1.0;
      
      case 'waterpurifier':
        if (temperature > 35) return 1.15;
        if (temperature > 30) return 1.10;
        if (temperature < 15) return 1.08;
        return 1.0;
      
      default:
        return 1.0;
    }
  }

  static calculateHumidityFactor(humidity, applianceKey) {
    const normalizedKey = applianceKey.replace('_', '');
    
    if (normalizedKey === 'dryer') {
      if (humidity > 80) return 1.25;
      if (humidity > 70) return 1.2;
      if (humidity > 60) return 1.15;
      if (humidity < 40) return 0.95;
    }
    
    if (normalizedKey === 'dishwasher') {
      if (humidity > 70) return 1.08;
      return 1.0;
    }
    
    if (normalizedKey === 'washingmachine') {
      if (humidity > 75) return 1.05;
      return 1.0;
    }
    
    if (normalizedKey === 'cooker') {
      if (humidity > 80) return 1.15;
      if (humidity > 70) return 1.10;
      return 1.0;
    }
    
    return 1.0;
  }

  static calculatePressureFactor(pressure) {
    return 1.0;
  }

  static getApplianceName(applianceKey) {
    const names = {
      dryer: 'Dryer',
      kettle: 'Kettle',
      microwave: 'Microwave',
      coffeemachine: 'Coffee Machine',
      airfryer: 'Air Fryer',
      toaster: 'Toaster',
      dishwasher: 'Dishwasher',
      washingmachine: 'Washing Machine',
      washing_machine: 'Washing Machine',
      cooker: 'Rice Cooker',
      xbox: 'Xbox',
      gaming_console: 'Gaming Console',
      waterpurifier: 'Water Purifier',
      water_purifier: 'Water Purifier'
    };
    return names[applianceKey] || applianceKey.charAt(0).toUpperCase() + applianceKey.slice(1);
  }

  static batchCalculateOptimizations(appliances) {
    return appliances.map(({ applianceKey, temperature, humidity, pressure, usageData }) => {
      try {
        const optimization = this.calculateOptimization(
          applianceKey, 
          temperature, 
          humidity, 
          pressure, 
          usageData
        );
        const notification = this.generateNotification(applianceKey, optimization);
        
        return {
          applianceKey,
          optimization,
          notification,
          success: true
        };
      } catch (error) {
        console.error(`Error processing ${applianceKey}:`, error);
        return {
          applianceKey,
          success: false,
          error: error.message
        };
      }
    });
  }

  static getSummaryStats(optimizations) {
    const validOptimizations = optimizations.filter(o => o.success);
    
    const totalAlerts = validOptimizations.reduce((sum, o) => sum + o.optimization.alerts.length, 0);
    const criticalAlerts = validOptimizations.reduce((sum, o) => 
      sum + o.optimization.alerts.filter(a => a.priority === 'critical').length, 0);
    const totalPotentialSavings = validOptimizations.reduce((sum, o) => 
      sum + o.optimization.potentialSavings, 0);
    const avgEfficiency = validOptimizations.reduce((sum, o) => 
      sum + o.optimization.efficiency, 0) / validOptimizations.length;

    return {
      totalAppliances: optimizations.length,
      successfulProcessing: validOptimizations.length,
      totalAlerts,
      criticalAlerts,
      totalPotentialSavings: Math.round(totalPotentialSavings),
      averageEfficiency: Math.round(avgEfficiency),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EnergyCalculator;