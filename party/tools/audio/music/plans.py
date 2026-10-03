"""Composition plans for the rhythm-game song set (rh-*). Two takes per song (take 2 varies instruments/wording)."""
NEG = ["vocals", "lyrics", "singing", "rap", "spoken word", "choir", "voice samples", "humming",
       "tempo change", "ritardando", "accelerando", "fade out", "key change", "dark", "scary", "aggressive distortion"]

SONGS = {
 'rh-afro': dict(name='Sunbird Dance', style='Afrobeat', bpm=104, key='G major', takes=[
   dict(genre=["West African afrobeat", "joyful kids music", "instrumental", "104 BPM", "G major", "4/4", "steady constant tempo", "live percussion"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {sparse: soft shaker and a single kalimba phrase, warm pad, breathing space}", ["soft shaker", "kalimba", "warm pad", "sparse"]),
         ('A', 8, 'groove', "[Groove A] {djembe and shekere groove with talking drum calls, bright marimba-like kalimba hook}", ["djembe groove", "shekere", "talking drum calls", "kalimba hook"]),
         ('breath1', 2, 'breath', "[Break] {drums drop out, only a soft pad and one talking drum fill}", ["sparse", "soft pad", "talking drum fill"]),
         ('B', 8, 'groove', "[Groove B] {highlife guitar picking with a gankogui bell pattern, light bass, kalimba melody}", ["highlife guitar", "gankogui bell pattern", "bouncy bass", "kalimba melody"]),
         ('breath2', 2, 'breath', "[Break] {only bell and shaker, breathing space}", ["sparse", "bell", "shaker"]),
         ('C', 12, 'groove', "[Groove C] {full polyrhythmic African drums, djembe, talking drum, bells, call-and-response kalimba and marimba melody, most energetic}", ["full polyrhythmic drums", "call and response kalimba melody", "marimba", "energetic", "celebration"]),
         ('ending', 4, 'breath', "[Ending] {band plays a short closing phrase and stops on one big unison hit, then silence}", ["final unison hit", "clean ending"]),
        ]),
   dict(genre=["afrobeat", "West African highlife", "happy children's dance music", "instrumental", "104 BPM", "G major", "4/4", "steady tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {gentle balafon notes over a soft pad, no drums yet}", ["balafon", "soft pad", "sparse"]),
         ('A', 8, 'groove', "[Section A] {djembe and shekere groove, talking drum answers, cheerful balafon melody}", ["djembe", "shekere", "talking drum", "balafon melody"]),
         ('breath1', 2, 'breath', "[Breather] {just shaker and a held chord}", ["sparse", "shaker", "held chord"]),
         ('B', 8, 'groove', "[Section B] {highlife guitar with an African bell pattern, warm bass, horn-like synth riff}", ["highlife guitar", "African bell pattern", "warm bass", "horn riff"]),
         ('breath2', 2, 'breath', "[Breather] {talking drum alone plays a short call}", ["talking drum solo", "sparse"]),
         ('C', 12, 'groove', "[Section C] {full polyrhythmic drum ensemble with call-and-response kalimba and balafon melody, big and joyful}", ["polyrhythmic drum ensemble", "call and response melody", "kalimba", "balafon", "joyful"]),
         ('ending', 4, 'breath', "[Ending] {everyone lands on a final unison hit and stops}", ["final hit", "clean stop"]),
        ]),
 ]),
 'rh-island': dict(name='Coconut Calypso', style='Calypso / soca', bpm=108, key='C major', takes=[
   dict(genre=["Caribbean calypso", "soca", "steel pan lead", "happy kids music", "instrumental", "108 BPM", "C major", "steady constant tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {solo steel pan plays a gentle phrase with light shaker}", ["solo steel pan", "light shaker", "sparse"]),
         ('A', 8, 'groove', "[Calypso] {calypso guitar strum and clave pattern, bouncy bass, catchy steel pan melody}", ["calypso guitar strum", "clave", "bouncy bass", "steel pan melody"]),
         ('breath1', 2, 'breath', "[Break] {drums stop, steel pan holds a chord}", ["sparse", "steel pan chord"]),
         ('B', 8, 'groove', "[Soca] {soca push with strong off-beat accents, cowbell, steel pan riff}", ["soca groove", "off-beat accents", "cowbell", "steel pan riff"]),
         ('breath2', 2, 'breath', "[Break] {only shakers and a short tom fill}", ["shakers", "tom fill", "sparse"]),
         ('C', 12, 'groove', "[Carnival] {carnival percussion breakdown building into the full band, steel pans and brass stabs, most energetic}", ["carnival percussion", "full band", "steel pans", "brass stabs", "festive"]),
         ('ending', 4, 'breath', "[Ending] {the band finishes with a final unison hit}", ["final hit", "clean ending"]),
        ]),
   dict(genre=["calypso", "soca", "tropical island party music for kids", "instrumental", "108 BPM", "C major", "steady tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {marimba and steel pan trade a soft phrase, no drums}", ["marimba", "steel pan", "sparse"]),
         ('A', 8, 'groove', "[Section A] {ukulele calypso strum, wooden clave, round bass, sunny steel pan tune}", ["ukulele strum", "clave", "round bass", "steel pan tune"]),
         ('breath1', 2, 'breath', "[Breather] {only a held organ chord and a shaker}", ["held chord", "shaker", "sparse"]),
         ('B', 8, 'groove', "[Section B] {soca drive with off-beat claps and cowbell, steel pan answers}", ["soca drive", "off-beat claps", "cowbell", "steel pan"]),
         ('breath2', 2, 'breath', "[Breather] {just congas, quiet}", ["congas", "sparse"]),
         ('C', 12, 'groove', "[Section C] {carnival drums, samba-like percussion, horns and steel pans together, big finale energy}", ["carnival drums", "horns", "steel pans", "big energy"]),
         ('ending', 4, 'breath', "[Ending] {ends with a clean final chord hit}", ["final hit"]),
        ]),
 ]),
 'rh-hiphop': dict(name='Block Party Bounce', style='Boom-bap hip hop', bpm=92, key='F minor', takes=[
   dict(genre=["kid-friendly boom bap hip hop instrumental", "92 BPM", "F minor", "light swing", "vinyl warmth", "steady constant tempo", "no rap"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {mellow electric piano chords with vinyl crackle, no drums}", ["electric piano", "vinyl crackle", "sparse"]),
         ('A', 8, 'groove', "[Boom Bap] {classic boom bap drums, record scratches, playful glockenspiel melody}", ["boom bap drums", "record scratches", "glockenspiel melody", "upright bass"]),
         ('breath1', 2, 'breath', "[Break] {drums drop, only the piano chord rings}", ["sparse", "piano"]),
         ('B', 8, 'groove', "[Half-time] {half-time beat with syncopated 808 rolls, plucky synth melody}", ["half-time beat", "808 rolls", "plucky synth melody"]),
         ('breath2', 2, 'breath', "[Break] {a single scratch and a bass note}", ["sparse", "scratch"]),
         ('C', 8, 'groove', "[Funk Break] {funky breakbeat with horn stabs and a bright brass melody, most energetic}", ["funk breakbeat", "horn stabs", "brass melody", "energetic"]),
         ('ending', 4, 'breath', "[Ending] {the beat stops on a final horn hit}", ["final horn hit", "clean ending"]),
        ]),
   dict(genre=["playful boom bap hip hop beat for kids", "instrumental only", "92 BPM", "F minor", "light swing", "steady tempo", "no rap"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {soft Rhodes and a warm bass note, breathing space}", ["Rhodes", "warm bass", "sparse"]),
         ('A', 8, 'groove', "[Section A] {dusty boom bap kick and snare, turntable scratches, toy piano hook}", ["boom bap", "turntable scratches", "toy piano hook"]),
         ('breath1', 2, 'breath', "[Breather] {only vinyl crackle and a held chord}", ["sparse", "held chord"]),
         ('B', 8, 'groove', "[Section B] {half-time groove with rolling 808 hi-hats and bass, marimba melody}", ["half-time", "rolling hi-hats", "808 bass", "marimba melody"]),
         ('breath2', 2, 'breath', "[Breather] {a short drum fill alone}", ["drum fill", "sparse"]),
         ('C', 8, 'groove', "[Section C] {funk break drums, wah guitar, horn section stabs and melody}", ["funk break", "wah guitar", "horn section"]),
         ('ending', 4, 'breath', "[Ending] {stop on one last horn stab}", ["final stab"]),
        ]),
 ]),
 'rh-reggae': dict(name='Sunshine Skank', style='Reggae / ska', bpm=96, key='D major', takes=[
   dict(genre=["sunny reggae instrumental for kids", "96 BPM", "D major", "melodica lead", "steady constant tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {melodica plays a soft phrase over an organ, no drums}", ["melodica", "organ", "sparse"]),
         ('A', 8, 'groove', "[One Drop] {one-drop reggae drums, off-beat guitar skank, deep bass, melodica melody}", ["one drop drums", "off-beat guitar skank", "deep bass", "melodica melody"]),
         ('breath1', 2, 'breath', "[Break] {only the bass and a rimshot}", ["bass", "rimshot", "sparse"]),
         ('B', 8, 'groove', "[Steppers] {steppers beat with four-on-the-floor kick, organ bubble, melodica answers}", ["steppers beat", "four on the floor kick", "organ bubble"]),
         ('breath2', 2, 'breath', "[Break] {echoing melodica note alone}", ["melodica echo", "sparse"]),
         ('C', 8, 'groove', "[Ska] {upbeat ska section with fast off-beat guitar and horns, same tempo, most energetic}", ["ska", "off-beat upstrokes", "horn section", "energetic"]),
         ('ending', 4, 'breath', "[Ending] {band stops on a final unison hit}", ["final hit", "clean ending"]),
        ]),
   dict(genre=["happy reggae and ska", "instrumental only", "96 BPM", "D major", "children's music", "steady tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {soft organ chords and a gentle guitar strum}", ["organ", "guitar", "sparse"]),
         ('A', 8, 'groove', "[Section A] {laid-back one drop groove, off-beat skank guitar, warm bass, whistle-like flute melody}", ["one drop", "skank guitar", "warm bass", "flute melody"]),
         ('breath1', 2, 'breath', "[Breather] {bass alone plays a short line}", ["bass solo", "sparse"]),
         ('B', 8, 'groove', "[Section B] {steppers rhythm with kick on every beat, bubbling organ, melodica}", ["steppers", "kick on every beat", "organ", "melodica"]),
         ('breath2', 2, 'breath', "[Breather] {just hand drums}", ["hand drums", "sparse"]),
         ('C', 8, 'groove', "[Section C] {bouncy ska with trumpet and trombone melody and off-beat chops}", ["ska", "trumpet", "trombone", "off-beat chops"]),
         ('ending', 4, 'breath', "[Ending] {final horn hit and stop}", ["final hit"]),
        ]),
 ]),
 'rh-bossa': dict(name='Moonlit Bossa', style='Bossa nova / samba', bpm=110, key='A major', takes=[
   dict(genre=["bossa nova", "Brazilian samba", "gentle kids music", "instrumental", "110 BPM", "A major", "steady constant tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {solo nylon-string guitar chords, very gentle}", ["solo nylon guitar", "sparse"]),
         ('A', 8, 'groove', "[Bossa] {gentle bossa nova with nylon guitar, soft brushes, upright bass, vibraphone melody}", ["bossa nova", "nylon guitar", "soft brushes", "vibraphone melody"]),
         ('breath1', 2, 'breath', "[Break] {only a held guitar chord and a shaker}", ["sparse", "shaker"]),
         ('B', 8, 'groove', "[Batucada] {samba batucada percussion: surdo, tamborim, agogo bells, joyful}", ["samba batucada", "surdo", "tamborim", "agogo bells"]),
         ('breath2', 2, 'breath', "[Break] {surdo alone keeps the pulse softly}", ["surdo", "sparse"]),
         ('C', 12, 'groove', "[Bossa and Samba] {bossa guitar and samba percussion together with a bright flute melody, most energetic}", ["samba percussion", "bossa guitar", "flute melody", "energetic"]),
         ('ending', 4, 'breath', "[Ending] {a final chord hit together and stop}", ["final hit", "clean ending"]),
        ]),
   dict(genre=["playful bossa nova and samba", "instrumental only", "110 BPM", "A major", "children's music", "steady tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {soft Rhodes and nylon guitar, no drums}", ["Rhodes", "nylon guitar", "sparse"]),
         ('A', 8, 'groove', "[Section A] {bossa nova groove, rim clicks and brushes, nylon guitar, flute melody}", ["bossa nova groove", "rim clicks", "brushes", "flute melody"]),
         ('breath1', 2, 'breath', "[Breather] {just the guitar}", ["guitar", "sparse"]),
         ('B', 8, 'groove', "[Section B] {samba school percussion, surdo, tamborim, agogo, pandeiro}", ["samba percussion", "surdo", "tamborim", "agogo", "pandeiro"]),
         ('breath2', 2, 'breath', "[Breather] {pandeiro alone, quiet}", ["pandeiro", "sparse"]),
         ('C', 12, 'groove', "[Section C] {full samba with bossa guitar, piano and flute melody, festive}", ["full samba", "piano", "flute melody", "festive"]),
         ('ending', 4, 'breath', "[Ending] {stop on one final chord hit}", ["final hit"]),
        ]),
 ]),
 'rh-tango': dict(name='Twirling Tango', style='Tango', bpm=112, key='D minor', takes=[
   dict(genre=["playful tango", "Argentine tango", "light and cheerful", "kids music", "instrumental", "112 BPM", "D minor", "steady constant tempo", "not dark"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {solo bandoneon plays a short playful phrase}", ["solo bandoneon", "sparse"]),
         ('A', 8, 'groove', "[Habanera] {habanera rhythm in the bass and piano, bandoneon melody}", ["habanera rhythm", "piano", "double bass", "bandoneon melody"]),
         ('breath1', 2, 'breath', "[Break] {only a held bandoneon chord}", ["sparse", "held chord"]),
         ('B', 8, 'groove', "[Marcato] {marcato four-beat tango with violin pizzicato and piano}", ["marcato tango", "violin pizzicato", "piano"]),
         ('breath2', 2, 'breath', "[Break] {a short piano run alone}", ["piano run", "sparse"]),
         ('C', 12, 'groove', "[Milonga] {milonga syncopation 3-3-2 with piano, staccato strings and bandoneon, most energetic}", ["milonga", "3-3-2 syncopation", "staccato strings", "bandoneon"]),
         ('ending', 4, 'breath', "[Ending] {classic tango ending: two final accented chords and stop}", ["final accented chords", "clean ending"]),
        ]),
   dict(genre=["cheerful tango for children", "instrumental only", "112 BPM", "D minor", "accordion and strings", "steady tempo", "playful"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {accordion and piano trade two soft notes}", ["accordion", "piano", "sparse"]),
         ('A', 8, 'groove', "[Section A] {habanera bass rhythm, accordion melody, light strings}", ["habanera", "accordion melody", "strings"]),
         ('breath1', 2, 'breath', "[Breather] {violin holds a note}", ["violin", "sparse"]),
         ('B', 8, 'groove', "[Section B] {strong four-beat marcato tango, pizzicato violins, piano chords}", ["marcato", "pizzicato violins", "piano chords"]),
         ('breath2', 2, 'breath', "[Breather] {only double bass}", ["double bass", "sparse"]),
         ('C', 12, 'groove', "[Section C] {milonga 3-3-2 syncopated rhythm, staccato strings, accordion and piano together}", ["milonga", "3-3-2 rhythm", "staccato strings", "accordion"]),
         ('ending', 4, 'breath', "[Ending] {tango-style final two chord hits}", ["final hits"]),
        ]),
 ]),
 'rh-flamenco': dict(name='Fiesta Fan', style='Rumba flamenca', bpm=112, key='A minor', takes=[
   dict(genre=["rumba flamenca", "flamenco-inspired", "cheerful kids music", "instrumental", "112 BPM", "A minor", "4/4", "steady constant tempo"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {solo Spanish guitar plays a short phrase}", ["solo Spanish guitar", "sparse"]),
         ('A', 8, 'groove', "[Rumba] {rumba guitar strum with palmas handclaps and cajon, guitar melody}", ["rumba guitar strum", "palmas", "cajon", "guitar melody"]),
         ('breath1', 2, 'breath', "[Break] {only soft palmas}", ["soft palmas", "sparse"]),
         ('B', 8, 'groove', "[Contratiempo] {off-beat contratiempo palmas, cajon, castanets, guitar melody}", ["off-beat palmas", "castanets", "cajon", "guitar melody"]),
         ('breath2', 2, 'breath', "[Break] {guitar rasgueado chord alone}", ["rasgueado chord", "sparse"]),
         ('C', 12, 'groove', "[Fiesta] {intense rasgueado rumba with accents 3+3+2+2+2, palmas, cajon, castanets, most energetic}", ["rasgueado", "accented compas", "palmas", "castanets", "energetic"]),
         ('ending', 4, 'breath', "[Ending] {final strummed chord and stop}", ["final hit", "clean ending"]),
        ]),
   dict(genre=["Spanish rumba flamenca for kids", "instrumental only", "112 BPM", "A minor", "acoustic guitars and percussion", "steady tempo", "joyful"],
        sections=[
         ('intro', 4, 'breath', "[Intro] {two guitars play a gentle duet, no percussion}", ["guitar duet", "sparse"]),
         ('A', 8, 'groove', "[Section A] {rumba strum, handclaps on the beat, cajon, nylon guitar lead}", ["rumba strum", "handclaps", "cajon", "guitar lead"]),
         ('breath1', 2, 'breath', "[Breather] {just a cajon tap}", ["cajon", "sparse"]),
         ('B', 8, 'groove', "[Section B] {off-beat handclaps, castanets, guitar picking melody}", ["off-beat handclaps", "castanets", "guitar picking"]),
         ('breath2', 2, 'breath', "[Breather] {single guitar strum rings}", ["guitar strum", "sparse"]),
         ('C', 12, 'groove', "[Section C] {full rumba fiesta, fast rasgueado strums, accented claps, castanets and cajon}", ["rasgueado", "accented claps", "castanets", "cajon", "fiesta"]),
         ('ending', 4, 'breath', "[Ending] {big final strum together}", ["final strum"]),
        ]),
 ]),
}


def plan(sid, take):
    s = SONGS[sid]; t = s['takes'][take - 1]
    bar_ms = 4 * 60000 / s['bpm']
    chunks = []
    acc = 0.0
    for i, (nm, bars, kind, text, pos) in enumerate(t['sections']):
        # whole bars; round cumulative boundaries so rounding never accumulates
        end = round((acc + bars * bar_ms))
        dur = end - round(acc); acc += bars * bar_ms
        styles = (t['genre'] + pos) if i == 0 else ([f"{s['bpm']} BPM", s['style']] + pos + ["instrumental"])
        chunks.append({'text': text, 'duration_ms': int(dur), 'positive_styles': styles,
                       'negative_styles': NEG, 'context_adherence': 'high'})
    return {'chunks': chunks}


def total_ms(sid, take=1):
    return sum(c['duration_ms'] for c in plan(sid, take)['chunks'])
