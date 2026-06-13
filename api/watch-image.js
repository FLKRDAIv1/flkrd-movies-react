import React from 'react';
import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

const h = React.createElement;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmahzalaxbkmhbpcally.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4';
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { ticket_id } = req.query;

  if (!ticket_id) {
    return res.status(400).send('ticket_id is required');
  }

  try {
    // 1. Fetch ticket from Supabase
    const { data: ticket, error: dbError } = await supabase
        .from('watch_tickets')
        .select('*')
        .eq('id', ticket_id)
        .single();

    let movieTitle = 'FLKRD Co-Watch Room';
    let pinCode = '0000';
    let posterPath = '';
    let backdropPath = '';
    let releaseYear = '2026';
    let movie_id = '';

    if (ticket) {
        movie_id = String(ticket.movie_id);
        pinCode = ticket.pin_code || '0000';
    }

    // 2. Fetch movie/show details from TMDB or Supabase
    if (movie_id) {
        if (movie_id.startsWith('tv_')) {
            const cleanId = movie_id.replace('tv_', '');
            try {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    movieTitle = data.name || data.original_name || movieTitle;
                    releaseYear = data.first_air_date ? data.first_air_date.split('-')[0] : releaseYear;
                    posterPath = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
                    backdropPath = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
                }
            } catch (e) {}
        } else if (movie_id.startsWith('custom_')) {
            const cleanId = movie_id.replace('custom_', '');
            try {
                const { data: dubData } = await supabase
                    .from('dubbed_movies')
                    .select('*')
                    .eq('id', cleanId)
                    .single();
                if (dubData) {
                    movieTitle = dubData.kurdishTitle || dubData.title || movieTitle;
                    releaseYear = dubData.created_at ? new Date(dubData.created_at).getFullYear().toString() : releaseYear;
                    posterPath = dubData.imageBase64 || dubData.poster_path || '';
                    backdropPath = dubData.bannerBase64 || dubData.poster_path || '';
                }
            } catch (e) {}
        } else {
            try {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movie_id}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    movieTitle = data.title || data.original_title || movieTitle;
                    releaseYear = data.release_date ? data.release_date.split('-')[0] : releaseYear;
                    posterPath = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
                    backdropPath = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
                }
            } catch (e) {}
        }
    }

    const defaultPoster = 'https://fkurd.pro/flkrd-icon.png';
    const defaultBackdrop = 'https://fkurd.pro/flkrd-icon.png';
    const posterUrl = posterPath || defaultPoster;
    const backdropUrl = backdropPath || defaultBackdrop;

    // Seating grid derived values
    const seatNumber = `${pinCode[0]}${pinCode[1]}`;
    const rowLetter = String.fromCharCode(64 + ((parseInt(pinCode[2]) % 8) + 1));
    const hallNumber = ((parseInt(pinCode[3]) % 6) + 1);

    const shareUrl = `https://fkurd.pro/watch/${ticket_id}`;
    const isWaiting = !ticket || ticket.status === 'waiting';
    const statusDotColor = isWaiting ? '#ea580c' : '#22c55e';
    const statusText = isWaiting ? 'WAITING FOR GUEST' : 'ACTIVE ✓';
    const statusLabel = isWaiting ? 'ADMIT ONE GUEST' : 'GUEST JOINED ✓';

    const imageResponse = new ImageResponse(
      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          position: 'relative',
          overflow: 'hidden',
        }
      }, [
        // 1. Blurred backdrop image (Satori-safe opacity background)
        h('img', {
          src: backdropUrl,
          style: {
            position: 'absolute',
            top: -50,
            left: -50,
            width: 1300,
            height: 730,
            opacity: 0.15,
          }
        }),

        // Radial orange glow in center behind the card
        h('div', {
          style: {
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: 300,
            backgroundImage: 'radial-gradient(circle, rgba(234, 88, 12, 0.15) 0%, rgba(0,0,0,0) 70%)',
          }
        }),

        // 2. Ticket container card
        h('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: 420,
            height: 580,
            borderRadius: 28,
            border: '2px solid rgba(234, 88, 12, 0.8)',
            background: '#0f0d0b',
            overflow: 'hidden',
            position: 'relative',
          }
        }, [
          // Bleed movie backdrop image at the top
          h('img', {
            src: backdropUrl,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: 420,
              height: 230,
              opacity: 0.3,
            }
          }),
          // Linear fade gradient to charcoal card body
          h('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: 420,
              height: 230,
              backgroundImage: 'linear-gradient(to bottom, rgba(15, 13, 11, 0.2) 0%, #0f0d0b 100%)',
            }
          }),

          // Header bar
          h('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              padding: '22px 24px 12px 24px',
              zIndex: 10,
            }
          }, [
            h('div', { style: { display: 'flex', flexDirection: 'column' } }, [
              h('span', {
                style: {
                  fontFamily: 'sans-serif',
                  fontWeight: 900,
                  fontSize: 10,
                  color: '#f97316',
                  letterSpacing: 3,
                }
              }, 'FLKRD CINEMA'),
              h('span', {
                style: {
                  fontFamily: 'sans-serif',
                  fontWeight: 700,
                  fontSize: 7,
                  color: '#71717a',
                  marginTop: 2,
                }
              }, 'PRIVATE SCREENING')
            ]),
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, [
              h('span', {
                style: {
                  fontFamily: 'sans-serif',
                  fontWeight: 900,
                  fontSize: 8,
                  color: '#a1a1aa',
                  letterSpacing: 1,
                }
              }, 'TICKET NO.'),
              h('span', {
                style: {
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: 10,
                  color: '#ea580c',
                  marginTop: 1,
                }
              }, `#FLK-${pinCode}`)
            ])
          ]),

          // Movie Poster + info row
          h('div', { style: { display: 'flex', padding: '0 24px 14px 24px', zIndex: 10 } }, [
            h('img', {
              src: posterUrl,
              style: {
                width: 100,
                height: 142,
                borderRadius: 12,
                border: '1.5px solid rgba(234, 88, 12, 0.3)',
              }
            }),
            h('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                marginLeft: 16,
                flex: 1,
                justifyContent: 'space-between',
              }
            }, [
              h('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                h('span', {
                  style: {
                    fontFamily: 'sans-serif',
                    fontWeight: 900,
                    fontSize: 8,
                    color: '#f97316',
                    letterSpacing: 2,
                  }
                }, 'NOW SCREENING'),
                h('span', {
                  style: {
                    fontFamily: 'sans-serif',
                    fontWeight: 900,
                    fontSize: movieTitle.length > 20 ? 14 : 17,
                    color: '#ffffff',
                    fontStyle: 'italic',
                    marginTop: 3,
                    lineHeight: 1.2,
                  }
                }, movieTitle),
                h('span', {
                  style: {
                    fontFamily: 'sans-serif',
                    fontWeight: 800,
                    fontSize: 9,
                    color: '#52525b',
                    marginTop: 2,
                  }
                }, releaseYear)
              ]),

              // Seating Grid (Hall, Row, Seat)
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 10 } }, [
                h('div', {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }
                }, [
                  h('span', { style: { fontSize: 7, fontWeight: 900, color: '#52525b' } }, 'HALL'),
                  h('span', { style: { fontSize: 10, fontWeight: 900, color: '#ffffff', marginTop: 1 } }, `0${hallNumber}`)
                ]),
                h('div', {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }
                }, [
                  h('span', { style: { fontSize: 7, fontWeight: 900, color: '#52525b' } }, 'ROW'),
                  h('span', { style: { fontSize: 10, fontWeight: 900, color: '#ffffff', marginTop: 1 } }, rowLetter)
                ]),
                h('div', {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }
                }, [
                  h('span', { style: { fontSize: 7, fontWeight: 900, color: '#52525b' } }, 'SEAT'),
                  h('span', { style: { fontSize: 10, fontWeight: 900, color: '#ffffff', marginTop: 1 } }, seatNumber)
                ])
              ])
            ])
          ]),

          // Live status admit ribbon
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '0 24px 12px 24px',
              padding: '0 12px',
              height: 34,
              borderRadius: 10,
              background: 'rgba(234, 88, 12, 0.08)',
              border: '1px solid rgba(234, 88, 12, 0.2)',
              zIndex: 10,
            }
          }, [
            h('div', { style: { display: 'flex', alignItems: 'center' } }, [
              h('div', {
                style: {
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  background: statusDotColor,
                  marginRight: 6,
                }
              }),
              h('span', {
                style: {
                  fontSize: 8.5,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: 2,
                }
              }, statusLabel)
            ]),
            h('span', {
              style: {
                fontSize: 8.5,
                fontWeight: 900,
                color: statusDotColor,
                letterSpacing: 1,
              }
            }, statusText)
          ]),

          // Entry Pin code
          h('div', { style: { display: 'flex', flexDirection: 'column', padding: '0 24px 14px 24px', zIndex: 10 } }, [
            h('span', { style: { fontSize: 7.5, fontWeight: 900, color: '#52525b', letterSpacing: 3 } }, 'ENTRY PIN CODE'),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
              }
            }, [
              h('div', { style: { display: 'flex' } }, [
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 48,
                    borderRadius: 10,
                    background: '#1c1917',
                    border: '1.5px solid rgba(234, 88, 12, 0.4)',
                    marginRight: 8,
                  }
                }, [
                  h('span', { style: { fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#f97316' } }, pinCode[0] || '0')
                ]),
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 48,
                    borderRadius: 10,
                    background: '#1c1917',
                    border: '1.5px solid rgba(234, 88, 12, 0.4)',
                    marginRight: 8,
                  }
                }, [
                  h('span', { style: { fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#f97316' } }, pinCode[1] || '0')
                ]),
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 48,
                    borderRadius: 10,
                    background: '#1c1917',
                    border: '1.5px solid rgba(234, 88, 12, 0.4)',
                    marginRight: 8,
                  }
                }, [
                  h('span', { style: { fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#f97316' } }, pinCode[2] || '0')
                ]),
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 48,
                    borderRadius: 10,
                    background: '#1c1917',
                    border: '1.5px solid rgba(234, 88, 12, 0.4)',
                  }
                }, [
                  h('span', { style: { fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#f97316' } }, pinCode[3] || '0')
                ])
              ]),

              h('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: '1px dashed rgba(234, 88, 12, 0.18)',
                }
              }, [
                h('span', { style: { fontSize: 7.5, fontWeight: 900, color: 'rgba(234, 88, 12, 0.65)', letterSpacing: 0.5 } }, 'ADMIT')
              ])
            ])
          ]),

          // Perforation line
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 2,
              padding: '0 24px',
              zIndex: 10,
            }
          }, [
            h('div', { style: { flex: 1, borderTop: '1.5px dashed rgba(255, 255, 255, 0.12)' } })
          ]),

          // Notches
          h('div', {
            style: {
              position: 'absolute',
              left: -12,
              top: 383,
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#000000',
              border: '1.5px solid rgba(234, 88, 12, 0.15)',
            }
          }),
          h('div', {
            style: {
              position: 'absolute',
              right: -12,
              top: 383,
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#000000',
              border: '1.5px solid rgba(234, 88, 12, 0.15)',
            }
          }),

          // Bottom stub section
          h('div', { style: { display: 'flex', padding: '14px 24px 10px 24px', zIndex: 10 } }, [
            h('div', { style: { display: 'flex', flexDirection: 'column' } }, [
              h('span', { style: { fontSize: 7, fontWeight: 900, color: '#52525b', letterSpacing: 2 } }, 'SCAN TO JOIN ROOM'),
              h('div', {
                style: {
                  display: 'flex',
                  marginTop: 6,
                  padding: 5,
                  borderRadius: 10,
                  background: '#ffffff',
                  width: 78,
                  height: 78,
                }
              }, [
                h('img', {
                  src: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    shareUrl
                  )}`,
                  style: { width: 68, height: 68 }
                })
              ]),
              h('span', { style: { fontSize: 6.5, color: '#52525b', marginTop: 4 } }, '(PIN Automatically Applied)')
            ]),

            h('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginLeft: 'auto',
                justifyContent: 'space-between',
              }
            }, [
              h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, [
                // Barcode lines
                h('div', { style: { display: 'flex', height: 35 } },
                  [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2].map((w, idx) =>
                    h('div', {
                      key: idx,
                      style: {
                        width: w,
                        height: 35,
                        background: '#ffffff',
                        opacity: 0.12 + (idx % 3) * 0.08,
                        marginRight: 2,
                      }
                    })
                  )
                ),
                h('span', {
                  style: {
                    fontFamily: 'monospace',
                    fontSize: 6.5,
                    color: '#52525b',
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }
                }, `#FLK-${pinCode}-${ticket_id.slice(0, 8).toUpperCase()}`)
              ]),

              h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, [
                h('span', { style: { fontSize: 6.5, fontWeight: 900, color: '#52525b', letterSpacing: 2 } }, 'HOST'),
                h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 2 } }, [
                  h('div', {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: 'rgba(234,88,12,0.2)',
                      border: '1px solid rgba(234,88,12,0.4)',
                    }
                  }, [
                    h('span', { style: { fontSize: 9, fontWeight: 900, color: '#ea580c' } }, 'Z')
                  ]),
                  h('span', { style: { fontSize: 10.5, fontWeight: 900, color: '#ffffff', marginLeft: 5 } }, 'Zana faroq')
                ])
              ])
            ])
          ]),

          // Bottom branding footer
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 24px 0 24px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              zIndex: 10,
              marginTop: 'auto',
              marginBottom: 10,
            }
          }, [
            h('span', { style: { fontSize: 6.5, fontWeight: 900, color: '#3f3f46', letterSpacing: 3 } }, 'FLKRD · CO-WATCH SYSTEM · 2026')
          ])
        ])
      ]),
      {
        width: 1200,
        height: 630,
      }
    );

    const buffer = await imageResponse.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error("Watch Party Ticket PNG generation error:", error);
    return res.status(500).send(`Watch Party Ticket PNG generation error:\nMessage: ${error.message}\nStack: ${error.stack}`);
  }
}
