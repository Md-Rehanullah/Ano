
DO $seed$
DECLARE
  authors text[] := ARRAY['Rahul Sharma','Priya Verma','Aarav Patel','Sneha Iyer','Vikram Singh','Ananya Reddy','Rohan Mehta','Kavya Nair','Arjun Kapoor','Ishita Bose','Karan Malhotra','Nisha Joshi','Aditya Rao','Pooja Desai','Manish Gupta','Divya Menon','Siddharth Khanna','Neha Pillai','Yash Agarwal','Riya Chatterjee','Harsh Bhatt','Tanvi Saxena','Aman Tiwari','Meera Krishnan','Dev Choudhary','Sanya Mishra'];
  cities text[] := ARRAY['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow','Indore','Kochi'];
  replies text[] := ARRAY[
    'Strong take, but missing the rural angle entirely.',
    'Hard disagree. Lived in {city} for 10 years and ground data says otherwise.',
    'This. Finally someone said it.',
    'Bhai, ground reality is very different from what Twitter tells you.',
    'I work in this exact sector. It is more nuanced.',
    'Half-true. The other half is uncomfortable.',
    'Boomer take. Gen Z is solving this differently.',
    'My parents went through exactly this. Trade-offs are real.',
    'Source? Genuinely curious, not trolling.',
    'OP, you are conflating two separate problems.',
    '100%. Nobody wants to talk about the class angle.',
    'This is why Tier-2 cities are quietly winning.',
    'Tried this in Pune last year. Did not scale.',
    'Government will never allow this. Vested interests.',
    'Reality check: 80% of India does not even have this option.',
    'The English-speaking bubble strikes again.',
    'Counter-point: in {city}, we already do this and it works.',
    'You are optimistic. I admire that.',
    'Doomer comment incoming — wont change in our lifetime.',
    'Both sides have a point. Truth is in the middle.'
  ];
  posts_data text[][] := ARRAY[
    ARRAY['Should English remain the medium of instruction in Indian schools?','Education','English opens global doors but many argue regional languages preserve culture and improve early learning. NEP 2020 pushes mother-tongue till Class 5. **What should win — opportunity or identity?**'],
    ARRAY['Is the metro really solving Bengaluru traffic?','General','Namma Metro Phase 2 is here, yet ORR is still gridlocked. Are we under-investing in last-mile or just adding more cars faster than tracks?'],
    ARRAY['Arranged marriage vs love marriage in 2026 — which lasts longer?','Lifestyle','Old debate, new data. Urban divorce rates are rising in both. Is family backing the real glue, or just delayed conflict?'],
    ARRAY['Should cricket lose its monopoly on Indian sports funding?','General','Hockey, kabaddi, athletics keep producing world-class talent on shoestring budgets. Time to redistribute BCCI-shaped attention?'],
    ARRAY['Is UPI a bigger achievement than Chandrayaan-3?','Technology','One sent us to the Moons south pole. The other quietly rewired daily life for a billion people. Which is the bigger flex?'],
    ARRAY['Are coaching hubs like Kota doing more harm than good?','Education','Suicide numbers, 16-hour days, parental pressure. But also: IIT seats and life-changing mobility. Net positive or net cost?'],
    ARRAY['Should Bollywood stop remaking South Indian films?','Lifestyle','Remakes routinely flop while originals thrive on OTT. Is it laziness, or just business?'],
    ARRAY['Is WFH killing Indian office culture — or saving our cities?','General','Bengaluru rent is finally cooling. Tier-2 towns are booming. Is the office obsolete or essential?'],
    ARRAY['Should Indian Railways be fully privatised?','General','Vande Bharat is shiny. Tatkal is broken. Can private operators fix it without pricing out the aam aadmi?'],
    ARRAY['Are influencers replacing journalists in India?','Technology','Instagram reels break news faster than primetime. But who is fact-checking the reel?'],
    ARRAY['Should Hindi be made compulsory across all states?','Education','One nation one language — unifier or imposition? Tamil Nadu has thoughts.'],
    ARRAY['Is the IIT brand still worth the JEE grind?','Education','Top recruiters now hire from Tier-2 colleges too. Is the 2-year sacrifice still ROI-positive?'],
    ARRAY['Should street food vendors be formalised under FSSAI?','Lifestyle','Hygiene vs livelihood. Can we have both without killing the vada pav economy?'],
    ARRAY['Is Aadhaar Indias greatest tech win or its biggest privacy disaster?','Technology','DBT savings are real. So are the leaks. Where do you stand?'],
    ARRAY['Should reservations be based on income, not caste?','General','Economic vs social justice — the eternal debate. What is actually fair in 2026?'],
    ARRAY['Are arranged-marriage matrimonial sites obsolete?','Lifestyle','Shaadi.com is older than Tinder in India. Is the algorithm finally winning over the aunty network?'],
    ARRAY['Should ISRO start charging private companies for launches?','Technology','SpaceX is a business. ISRO is a service. Should that change?'],
    ARRAY['Is Indian English a real dialect or just broken English?','Education','Prepone, do the needful, out of station. Linguistic creativity or grammar crime?'],
    ARRAY['Should we ban firecrackers nationwide during Diwali?','Lifestyle','Delhi AQI says yes. Tradition says no. Is a green-cracker compromise enough?'],
    ARRAY['Is the gig economy exploiting Indias youth?','General','Swiggy, Zomato, Uber — flexibility or modern bonded labour without benefits?'],
    ARRAY['Should helmet laws apply to pillion riders too?','General','Half of two-wheeler deaths are pillions. Yet enforcement is patchy. Why?'],
    ARRAY['Is OTT killing the single-screen cinema?','Lifestyle','PVR profits are up but small-town theatres are shutting. Is that progress?'],
    ARRAY['Should JEE/NEET be conducted twice a year in regional languages?','Education','Equity vs standardisation. NTA is overwhelmed. Where is the sweet spot?'],
    ARRAY['Are EVs really greener in Indias coal-powered grid?','Technology','Tank-to-wheel zero. Well-to-wheel? Depends on your discom.'],
    ARRAY['Should political parties be brought under RTI?','General','They take public funds and run public campaigns. Why the secrecy?'],
    ARRAY['Is yoga being over-commercialised by Patanjali and the West?','Lifestyle','From ashrams to Lululemon. Is it dilution or global reach?'],
    ARRAY['Should Indian schools stop ranking students publicly?','Education','Healthy competition or daily humiliation? The Finland question for CBSE.'],
    ARRAY['Is Hindi cinema finally outgrowing the item number?','Lifestyle','Animal vs Laapataa Ladies. Which Bollywood is winning the box office in 2026?'],
    ARRAY['Should we have a uniform civil code already?','General','Article 44 has waited 75 years. Is the time finally now, or never?'],
    ARRAY['Is Kashmirs tourism boom sustainable?','Lifestyle','Record arrivals, fragile ecology. Are we Goa-ifying Gulmarg?'],
    ARRAY['Should auto-rickshaws be replaced by app-only e-rickshaws?','Technology','Meter scams vs surge pricing. Pick your poison.'],
    ARRAY['Are parents the real reason Indian kids underperform in sports?','Education','Padhai pehle — the four words killing every Olympic dream?'],
    ARRAY['Should Indian Railways have women-only trains, not just coaches?','General','Safety win or segregation creep?'],
    ARRAY['Is the H-1B dream finally dead for Indian engineers?','Technology','With layoffs, 60-day clocks, and GCC salaries rising, is staying back the new flex?'],
    ARRAY['Should cow vigilantism be classified as a hate crime?','General','Faith vs federal law. Where is the line?'],
    ARRAY['Is the 70-hour work week pitch a betrayal of Indian families?','Lifestyle','Narayana Murthy started it. Is grind culture a colonial hangover?'],
    ARRAY['Should English-medium be banned in government schools?','Education','Identity-first or opportunity-first — round two.'],
    ARRAY['Is Indian classical music being saved or buried by fusion?','Lifestyle','A.R. Rahman or the purists — who is right?'],
    ARRAY['Should we have direct elections for the Prime Minister?','General','Parliamentary stability vs presidential clarity. Which suits us?'],
    ARRAY['Is Jio responsible for the death of Indian content quality?','Technology','Free data, infinite reels, zero attention spans. Worth the trade?'],
    ARRAY['Should homework be banned till Class 5?','Education','Finland did it. CBSE flirted with it. Why the hesitation?'],
    ARRAY['Is the Indian wedding industry out of control?','Lifestyle','50 lakh average urban wedding. Status symbol or financial trap?'],
    ARRAY['Should farmers get a legal MSP guarantee?','General','2020 protests. 2024 protests. Will 2026 finally settle it?'],
    ARRAY['Is Tier-2 India the new startup capital?','Technology','Indore, Coimbatore, Jaipur. Bengaluru should be worried — or proud?'],
    ARRAY['Should mental health be a board-exam subject?','Education','Kota, JEE, peer pressure. Are we 50 years late?'],
    ARRAY['Is South Indian food healthier than North Indian food?','Lifestyle','Idli vs paratha. Coconut oil vs ghee. Fight!'],
    ARRAY['Should social media be banned for under-16s in India?','Technology','Australia did it. India has 350M teen users. Could it even work?'],
    ARRAY['Is Indian democracy still the worlds largest, or just the loudest?','General','Voter turnout is up. Trust in institutions is down. Reconcile?'],
    ARRAY['Should we abolish the Rajya Sabha?','General','A house of elders, or a backdoor for losers?'],
    ARRAY['Is Indian street style finally challenging Paris and Milan?','Lifestyle','Lakme Fashion Week is global. Is khadi the new luxury?']
  ];
  i int;
  j int;
  k int;
  pid uuid;
  cid uuid;
  rid uuid;
  pcreated timestamptz;
  ccreated timestamptz;
  rcreated timestamptz;
  n_roots int;
  n_replies int;
  likes int;
  views int;
  ctext text;
BEGIN
  FOR i IN 1..array_length(posts_data, 1) LOOP
    pid := gen_random_uuid();
    pcreated := now() - (random() * interval '9 days') - (random() * interval '1 day');
    likes := 5 + floor(random() * 315)::int;
    views := likes * (8 + floor(random() * 32)::int) + 20 + floor(random() * 180)::int;

    INSERT INTO public.posts (id, user_id, title, description, category, likes, views, is_seed, seed_author_name, created_at, updated_at)
    VALUES (
      pid, NULL,
      posts_data[i][1], posts_data[i][3], posts_data[i][2],
      likes, views, true,
      authors[1 + floor(random() * array_length(authors,1))::int],
      pcreated, pcreated
    );

    n_roots := 4 + floor(random() * 5)::int;
    FOR j IN 1..n_roots LOOP
      cid := gen_random_uuid();
      ccreated := pcreated + (random() * interval '48 hours') + interval '1 hour';
      ctext := replace(replies[1 + floor(random() * array_length(replies,1))::int], '{city}', cities[1 + floor(random() * array_length(cities,1))::int]);

      INSERT INTO public.answers (id, post_id, user_id, content, parent_id, likes, is_seed, seed_author_name, created_at, updated_at)
      VALUES (
        cid, pid, NULL,
        ctext, NULL,
        floor(random() * 46)::int, true,
        authors[1 + floor(random() * array_length(authors,1))::int],
        ccreated, ccreated
      );

      IF random() < 0.55 THEN
        n_replies := 1 + floor(random() * 3)::int;
        FOR k IN 1..n_replies LOOP
          rid := gen_random_uuid();
          rcreated := ccreated + (random() * interval '24 hours') + interval '1 hour';
          ctext := replace(replies[1 + floor(random() * array_length(replies,1))::int], '{city}', cities[1 + floor(random() * array_length(cities,1))::int]);

          INSERT INTO public.answers (id, post_id, user_id, content, parent_id, likes, is_seed, seed_author_name, created_at, updated_at)
          VALUES (
            rid, pid, NULL,
            ctext, cid,
            floor(random() * 21)::int, true,
            authors[1 + floor(random() * array_length(authors,1))::int],
            rcreated, rcreated
          );
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END
$seed$;
