import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active verticals
    const { data: verticals } = await supabase
      .from('verticals')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order')
      .limit(10);

    if (!verticals || verticals.length < 3) {
      throw new Error('Need at least 3 active verticals to seed assessments');
    }

    const verticalIds = verticals.map(v => v.id);

    // Define test candidate profiles with realistic responses
    const candidateProfiles = [
      {
        name: "Priya Sharma",
        email: "priya.test@yi.com",
        profile: "High Performer - Chair Material",
        responses: {
          q1_partA: "The lack of menstrual hygiene awareness in government schools in Erode deeply frustrates me. Last year, I volunteered at a rural school and saw 14-year-old girls missing classes because they had no access to sanitary products or even basic information about periods. One girl told me she stays home 5 days every month because she's ashamed and doesn't know how to manage. This isn't just about products - it's about dignity, education, and breaking the cycle of stigma. When I realized that something as natural as menstruation was keeping bright young girls from their fundamental right to education, I knew I couldn't just walk away. This issue affects thousands of girls across Erode, limiting their potential and perpetuating gender inequality.",
          q1_verticals: [verticalIds[0], verticalIds[1], verticalIds[2]],
          q2_initiative: "I would launch 'Period Power Erode' - a 6-month peer education and product distribution initiative. Month 1-2: Train 50 college volunteers (including male allies) on menstrual health education using WHO-approved curriculum. Partner with local NGO Goonj for product supply chain. Month 3-5: Deploy volunteers to 25 government schools reaching 10,000+ girls through interactive workshops, not lectures. Each session includes myth-busting, product demos, and Q&A with female doctors. Distribute 3-month starter kits (₹200 each, 5000 kits = ₹10L, negotiate bulk discount to ₹35K). Month 6: Establish 'Period Pantries' in school bathrooms with emergency supplies, train 2 teachers per school as champions. Use remaining ₹15K for awareness posters and a WhatsApp helpline. Impact: 10,000 girls educated, 5,000 equipped with supplies, 50 peer educators trained, 25 schools with sustainable support systems. Success metric: School attendance data showing reduced absenteeism for target demographic.",
          q3_saturday: "I'd tell my family: 'There's an emergency at Yi, I need to help for a few hours. Let me make it up to you with breakfast tomorrow.' Then I'd head to the office immediately. When you're building something bigger than yourself, these moments define whether you're truly committed or just interested. My family knows Yi matters to me and supports my involvement. I'd show up, figure out what needs to be done, and stay as long as needed - whether that's 3 hours or 6. That said, I'd also think about why we're in last-minute crisis mode and suggest better planning systems afterward. But first, I'd execute. That's what leadership means - showing up when it's inconvenient, not just when it's comfortable.",
          q4_achievement: "I organized our college's first-ever blood donation camp that collected 250 units in one day - exceeding our 150-unit goal by 67%. The obstacle was student apathy and fear of needles. Many said 'nice idea but I'm busy' or 'I'm scared of blood.' Instead of generic posters, I shared personal stories on Instagram - interviewed donors about why they give, posted facts about how one donation saves 3 lives. I recruited 10 friends as 'Blood Ambassadors' who each committed to bringing 5 donors. We gamified it with a leaderboard. On camp day, I personally walked nervous first-timers through the process and stayed all 8 hours troubleshooting logistics. The outcome: 250 units collected, 750 potential lives saved, and our college now hosts camps quarterly. I learned that people need emotional connection, not just information, to take action.",
          q5_leadership: "leader"
        }
      },
      {
        name: "Arjun Patel",
        email: "arjun.test@yi.com", 
        profile: "Vertical Lead Material",
        responses: {
          q1_partA: "Erode's waste management is a disaster. Every morning I see plastic waste choking our Periyar river, and municipal garbage piling up in residential areas. Three months ago, I was jogging near the river and watched a family dump plastic bags directly into the water. When I asked them why, they said 'there's nowhere else to put it.' That broke me. We have hundreds of families treating our river like a garbage dump because there's no proper waste segregation system or recycling infrastructure. This isn't just ugly - it's a public health crisis. Kids play near contaminated water. The smell is unbearable in summer. And we're teaching the next generation that destroying nature is normal. I can't accept that.",
          q1_verticals: [verticalIds[1], verticalIds[2], verticalIds[0]],
          q2_initiative: "Launch 'Erode Clean Rivers' initiative targeting 100 families along 5km riverbank stretch. Month 1: Map waste sources, partner with Municipality and existing NGO Swachh Erode. Budget ₹10K for waste audit. Month 2-3: Design 3-bin segregation system (wet/dry/sanitary), source 300 bins at ₹100 each (₹30K). Train 10 volunteer 'Waste Warriors' in door-to-door education (₹5K for materials). Month 4-5: Deploy Waste Warriors for weekly household visits educating 100 families + 20 local shops on segregation benefits. Set up weekly collection system with Municipality (free partnership). Install 5 community compost pits using remainder ₹5K. Month 6: Document results, create replication toolkit for other areas. Direct reach: 100 families (500 people) + 20 shops. Indirect reach: 10,000+ residents see cleaner neighborhoods and want in. Measure success: reduction in riverbank waste (before/after photos), participation rate, waste diverted from landfill.",
          q3_saturday: "I'd honestly need to check what the emergency is first. If it's truly critical and my piece is essential, I'd tell my family I need to step out for a few hours and head over. If it's something others can handle or it can wait until tomorrow, I'd offer to help remotely tonight and come in first thing Sunday morning. I believe in commitment, but I also think we shouldn't normalize last-minute firefighting. If this becomes a pattern, we need better planning. That said, emergencies happen and when my team needs me, I'll show up. Just need transparency about what's actually urgent versus what's poor planning.",
          q4_achievement: "I taught 30 underprivileged kids basic coding through a 2-month weekend program I started in my neighborhood. The challenge was keeping them engaged when they had no computers at home and limited English. I got a local computer center to donate Saturday space, created hands-on projects using free tools like Scratch, and paired coding with practical stuff they cared about - like making a digital birthday card for their mom. Some Saturdays only 10 kids showed up, but I kept going. By the end, 25 kids completed the program and 8 built their own simple games. Three told me they want to study computer science now. The outcome isn't just coding skills - it's showing kids from non-tech backgrounds that this field is for them too.",
          q5_leadership: "doer"
        }
      },
      {
        name: "Meera Krishnan",
        email: "meera.test@yi.com",
        profile: "EC Member Material", 
        responses: {
          q1_partA: "Mental health stigma among students in Erode colleges is something I've experienced firsthand. Last semester, my friend was dealing with severe anxiety and depression but was too scared to seek help because of the shame attached to mental health issues. Her family said 'what will people think?' and her friends didn't know how to support her. I watched her struggle silently for months, her grades dropping, isolating herself. When she finally opened up to me, I helped her find counseling, but it shouldn't have been that hard. So many students are suffering in silence because we don't talk about mental health openly. It's treated as weakness or something shameful instead of healthcare. This stigma is literally costing students their wellbeing and academic success.",
          q1_verticals: [verticalIds[2], verticalIds[0], verticalIds[1]],
          q2_initiative: "Start 'Mind Matters Erode' peer support network across 10 colleges. Month 1-2: Train 50 peer supporters (5 per college) in mental health first aid using online certified course (₹15K). Partner with college counseling centers and local psychiatrist for expert guidance. Month 3-4: Launch awareness campaign - Instagram reels, campus workshops, anonymous story sharing platform. Budget ₹10K for social media boost and workshop materials. Each college hosts one big event reaching 1000+ students. Month 5: Set up confidential WhatsApp peer support groups, one per college, managed by trained supporters. Create resource directory of affordable counseling options. Cost: ₹5K for website and printed resources. Month 6: Sustainability planning - train next batch of peer supporters, establish college partnerships for ongoing funding. Reach 10,000+ through events, support 500+ through peer groups, train 50 peer supporters who can continue beyond 6 months. Success: utilization rates, feedback surveys, reduction in crisis situations.",
          q3_saturday: "I would go. It's not ideal timing and I'd prefer notice, but if there's a real emergency and the team needs help, that's what being part of Yi means. I'd let my family know it's urgent work stuff, apologize for the disruption, and head over. I'd try to be efficient so I'm not there longer than needed, but I'd stay until the work is done. That said, I'd also hope this isn't a regular thing - emergencies are one thing, but consistently bad planning that requires weekend bailouts isn't sustainable. I'm committed to Yi but also value work-life boundaries for the long run.",
          q4_achievement: "I organized a successful fundraiser that raised ₹50,000 for flood relief in my hometown last year. The obstacle was donor fatigue - people were getting so many flood relief requests they were tuning out. I differentiated by focusing on one specific need: school supplies for 200 kids whose books were destroyed in floods. Instead of asking for generic donations, I created 'sponsor a student' packages at ₹250 each with photos and names of real kids. I leveraged my college networks, posted daily updates on Instagram showing the impact, and made it personal. Within two weeks we hit our goal. Seeing those kids back in school with new books and supplies made all the late nights worth it. I learned that specific asks with clear impact beat generic fundraising.",
          q5_leadership: "learning"
        }
      },
      {
        name: "Rahul Verma",
        email: "rahul.test@yi.com",
        profile: "Advisor/Specialist Material",
        responses: {
          q1_partA: "I care about financial literacy gaps among young adults in Erode. Many of my peers don't understand basic concepts like savings, investments, or credit scores, which sets them up for financial struggles later. I noticed this when my roommate took a high-interest personal loan without understanding the terms and got trapped in debt. He wasn't irresponsible - he just didn't know better. Our education system teaches calculus but not budgeting. This knowledge gap affects thousands of young people making their first financial decisions without proper guidance, leading to debt traps and missed opportunities.",
          q1_verticals: [verticalIds[0], verticalIds[2], verticalIds[1]],
          q2_initiative: "Create 'Money Smart Erode' financial literacy program for 5,000 college students. Month 1: Develop curriculum covering budgeting, saving, credit, investments, avoiding scams (partner with CA and financial advisor, ₹5K consulting fee). Month 2-3: Train 20 peer educators from commerce/economics backgrounds (₹5K for training materials). Month 4-5: Deliver 2-hour workshops at 10 colleges (500 students each = 5,000 total). Use real case studies, interactive budgeting exercises, and practical tools. Create Instagram content for broader reach (₹10K for content creation and boosting). Month 6: Launch 'Money Mentor' WhatsApp helpline where trained peers answer basic questions. Remaining ₹30K for workshop logistics, printed guides, and certificate printing. Reach: 5,000 direct workshop participants, 10,000+ through social media. Create scalable toolkit for other cities.",
          q3_saturday: "I'd probably say I can help remotely tonight if there's analysis or planning work I can do from home, but coming in person might be tough given I'm with family. If it absolutely requires being there in person and I'm truly essential, I'd try to come but it depends on what family commitments I have. I want to be honest - I value my weekends and family time, and last-minute requests are stressful for me. I'm happy to be the person who stays late on weekdays or helps with advance planning, but weekend emergencies should be rare. If this is a frequent pattern, we should look at our project management.",
          q4_achievement: "I built a financial planning spreadsheet tool that 50+ students now use to track their expenses and budgets. It started when I created one for myself to manage my scholarship money, and friends asked for copies. Instead of just sharing the basic version, I spent a month adding features like automatic expense categorization, savings goal tracking, and spending insights. I taught myself advanced Excel formulas through YouTube tutorials to make it truly useful. The challenge was making it simple enough for non-finance people while keeping it powerful. Now students message me saying it helped them save money or avoid overspending. It's not flashy, but it's practical impact that matters to me.",
          q5_leadership: "strategic"
        }
      },
      {
        name: "Divya Reddy",
        email: "divya.test@yi.com",
        profile: "Developing Candidate",
        responses: {
          q1_partA: "I think traffic congestion in Erode is really bad. Every day it takes forever to get anywhere because of the traffic. Especially near the bus stand area it gets really crowded. I feel like there should be better traffic management or something. It's frustrating when you're late to college because of traffic jams. Maybe more traffic police or better signals would help. This affects a lot of people who commute daily for work and studies.",
          q1_verticals: [verticalIds[1], verticalIds[0], verticalIds[2]],
          q2_initiative: "I would organize traffic awareness campaigns in busy areas. We could make posters and pamphlets about following traffic rules and distribute them at signals. Maybe organize some events where we talk to people about safe driving and not causing congestion. We could also do social media posts to spread awareness. Partner with traffic police to get their support. Use the money to print materials and organize events. Try to reach people through colleges and schools too. The goal would be to make people more aware of traffic rules and how their behavior affects congestion.",
          q3_saturday: "I would try to help if I can, but it depends on the situation. If my family has important plans I might not be able to come immediately. I would probably explain to my family that work needs me and see if they understand. If possible I would go, but if not then maybe I could help the next day. I want to be helpful but also don't want to disappoint my family. It's a difficult situation and I would try to find a balance.",
          q4_achievement: "I did well in my semester exams and got good grades. I studied hard for all my subjects and managed to score above 80% overall. The challenge was having to study multiple subjects at the same time and managing time between them. I made a study schedule and followed it mostly. I also formed a study group with friends which helped. The result was good grades which made my parents happy and I felt proud of myself.",
          q5_leadership: "learning"
        }
      }
    ];

    const createdAssessments = [];

    for (const profile of candidateProfiles) {
      // Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_name: profile.name,
          user_email: profile.email,
          status: 'completed',
          current_question: 5,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assessmentError) {
        console.error('Error creating assessment:', assessmentError);
        continue;
      }

      // Create Q1 response
      await supabase.from('assessment_responses').insert({
        assessment_id: assessment.id,
        question_number: 1,
        question_text: 'Personal Irritation → Vertical Selection',
        response_data: {
          partA: profile.responses.q1_partA,
          priority1: profile.responses.q1_verticals[0],
          priority2: profile.responses.q1_verticals[1],
          priority3: profile.responses.q1_verticals[2],
          hasAnalyzed: true,
          suggestedVerticals: profile.responses.q1_verticals
        }
      });

      // Create Q2 response
      await supabase.from('assessment_responses').insert({
        assessment_id: assessment.id,
        question_number: 2,
        question_text: 'Initiative Design',
        response_data: {
          response: profile.responses.q2_initiative
        }
      });

      // Create Q3 response
      await supabase.from('assessment_responses').insert({
        assessment_id: assessment.id,
        question_number: 3,
        question_text: 'Saturday Emergency Response',
        response_data: {
          response: profile.responses.q3_saturday
        }
      });

      // Create Q4 response
      await supabase.from('assessment_responses').insert({
        assessment_id: assessment.id,
        question_number: 4,
        question_text: 'Your Most Significant Achievement',
        response_data: {
          response: profile.responses.q4_achievement
        }
      });

      // Create Q5 response
      await supabase.from('assessment_responses').insert({
        assessment_id: assessment.id,
        question_number: 5,
        question_text: 'Team Deadline Scenario',
        response_data: {
          leadershipStyle: profile.responses.q5_leadership
        }
      });

      // Trigger analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
        'analyze-assessment',
        { body: { assessmentId: assessment.id } }
      );

      if (analysisError) {
        console.error(`Analysis failed for ${profile.name}:`, analysisError);
      } else {
        console.log(`✓ Created and analyzed: ${profile.name} (${profile.profile})`);
      }

      createdAssessments.push({
        name: profile.name,
        profile: profile.profile,
        assessment_id: assessment.id,
        analyzed: !analysisError
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdAssessments.length} test assessments`,
        assessments: createdAssessments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding assessments:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
