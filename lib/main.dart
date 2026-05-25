
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';

void main() {
  runApp(const FlkrdApp());
}

class FlkrdApp extends StatelessWidget {
  const FlkrdApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FLKRD MOVIES',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        primaryColor: const Color(0xFFE50914),
        textTheme: GoogleFonts.ibmPlexSansArabicTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  bool _isSidebarExpanded = false;

  @override
  Widget build(BuildContext context) {
    bool isDesktop = MediaQuery.of(context).size.width > 900;

    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          // Background Mesh Gradients
          const Positioned.fill(child: MeshBackground()),
          
          Row(
            children: [
              if (isDesktop) _buildSidebar(),
              Expanded(
                child: IndexedStack(
                  index: _currentIndex,
                  children: [
                    const HomePage(),
                    const ShortsPage(),
                    Container(child: const Center(child: Text("TV Shows"))),
                    Container(child: const Center(child: Text("Search"))),
                  ],
                ),
              ),
            ],
          ),

          // Global Watching Portal
          const Positioned(
            bottom: 30,
            right: 30,
            child: NeuralPortal(),
          ),
        ],
      ),
      bottomNavigationBar: isDesktop ? null : const LiquidBottomNav(),
    );
  }

  Widget _buildSidebar() {
    return MouseRegion(
      onEnter: (_) => setState(() => _isSidebarExpanded = true),
      onExit: (_) => setState(() => _isSidebarExpanded = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: _isSidebarExpanded ? 250 : 80,
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.8),
          border: Border(right: BorderSide(color: Colors.white.withOpacity(0.05))),
        ),
        child: Column(
          children: [
            const SizedBox(height: 40),
            Image.network('https://fkurd.vercel.app/flkrd-icon.png', height: 40),
            const SizedBox(height: 40),
            _navItem(Icons.home_filled, "HOME", 0),
            _navItem(Icons.play_circle_outline, "SHORTS", 1),
            _navItem(Icons.tv, "SERIES", 2),
            _navItem(Icons.search, "SEARCH", 3),
          ],
        ),
      ),
    );
  }

  Widget _navItem(IconData icon, String label, int index) {
    bool active = _currentIndex == index;
    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      child: Container(
        height: 60,
        padding: const EdgeInsets.symmetric(horizontal: 25),
        child: Row(
          children: [
            Icon(icon, color: active ? Colors.red : Colors.grey[600]),
            if (_isSidebarExpanded) ...[
              const SizedBox(width: 20),
              Text(label, style: TextStyle(
                color: active ? Colors.white : Colors.grey,
                fontWeight: active ? FontWeight.black : FontWeight.normal,
                letterSpacing: 1.2,
                fontSize: 12,
              )),
            ]
          ],
        ),
      ),
    );
  }
}

class MeshBackground extends StatelessWidget {
  const MeshBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: -100,
          left: -100,
          child: Container(
            width: 400,
            height: 400,
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100), child: Container()),
          ),
        ),
      ],
    );
  }
}

class NeuralPortal extends StatefulWidget {
  const NeuralPortal({super.key});

  @override
  State<NeuralPortal> createState() => _NeuralPortalState();
}

class _NeuralPortalState extends State<NeuralPortal> {
  bool isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => isExpanded = !isExpanded),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 500),
        curve: Curves.elasticOut,
        width: isExpanded ? 300 : 70,
        height: 70,
        decoration: BoxDecoration(
          color: const Color(0xFF0C0C0C),
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 30, spreadRadius: 10)
          ],
        ),
        child: isExpanded ? _buildExpanded() : _buildCollapsed(),
      ),
    );
  }

  Widget _buildCollapsed() {
    return Stack(
      alignment: Alignment.center,
      children: [
        CircularProgressIndicator(value: 0.7, strokeWidth: 2, color: Colors.red),
        const Icon(Icons.history, color: Colors.white, size: 20),
      ],
    );
  }

  Widget _buildExpanded() {
    return Row(
      children: [
        const SizedBox(width: 5),
        ClipOval(child: Image.network('https://fkurd.vercel.app/flkrd-icon.png', width: 60, height: 60)),
        const SizedBox(width: 15),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("RESUME NODE", style: TextStyle(color: Colors.grey, fontSize: 8, fontWeight: FontWeight.bold)),
              const Text("NE ZHA 2", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.black, fontStyle: FontStyle.italic)),
            ],
          ),
        ),
        const Icon(Icons.play_arrow_rounded, color: Colors.red),
        const SizedBox(width: 20),
      ],
    );
  }
}

class LiquidBottomNav extends StatelessWidget {
  const LiquidBottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(20),
      height: 70,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.4),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Icon(Icons.home_filled, color: Colors.red),
              Icon(Icons.play_circle_outline, color: Colors.white54),
              Icon(Icons.search, color: Colors.white54),
              Icon(Icons.person_outline, color: Colors.white54),
            ],
          ),
        ),
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        const SliverToBoxAdapter(child: HeroCarousel()),
        SliverToBoxAdapter(
          child: ContentRow(title: "TRENDING NOW"),
        ),
        SliverToBoxAdapter(
          child: ContentRow(title: "DUBBED ARCHIVE"),
        ),
        const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
      ],
    );
  }
}

class ContentRow extends StatelessWidget {
  final String title;
  const ContentRow({required this.title, super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(width: 4, height: 25, color: Colors.red),
              const SizedBox(width: 15),
              Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.black, fontStyle: FontStyle.italic)),
            ],
          ),
        ),
        SizedBox(
          height: 250,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(left: 20),
            itemCount: 10,
            itemBuilder: (context, index) => const MovieCard(),
          ),
        )
      ],
    );
  }
}

class MovieCard extends StatelessWidget {
  const MovieCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 15),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Image.network('https://rashaba.com/upload2/videos/2026/01/mKkhrFhjQr3CKwz/mKkhrFhjQr3CKwz.webp_640.webp', fit: BoxFit.cover, height: double.infinity),
            Container(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black.withOpacity(0.8)]))),
          ],
        ),
      ),
    );
  }
}

class HeroCarousel extends StatelessWidget {
  const HeroCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 500,
      child: Stack(
        children: [
          Image.network('https://image.tmdb.org/t/p/w1280/uDgy6hyPdZ2Unpawnv39zX0YpJu.jpg', fit: BoxFit.cover, width: double.infinity),
          Container(decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black, Colors.transparent]))),
          Positioned(
            bottom: 40,
            left: 30,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("FEATURE FILM", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 10, letterSpacing: 4)),
                const Text("NE ZHA 2", style: TextStyle(fontSize: 48, fontWeight: FontWeight.black, fontStyle: FontStyle.italic)),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.play_arrow),
                  label: const Text("STREAM NOW"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15)),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}

class ShortsPage extends StatelessWidget {
  const ShortsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PageView.builder(
      scrollDirection: Axis.vertical,
      itemBuilder: (context, index) => Stack(
        children: [
          Container(color: Colors.black, child: const Center(child: Icon(Icons.play_circle_fill, size: 80, color: Colors.white24))),
          Positioned(
            bottom: 100,
            left: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("@FLKRD_SYSTEM", style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                const Text("Checking out the new action sequence #MovieShorts"),
              ],
            ),
          ),
          Positioned(
            right: 20,
            bottom: 150,
            child: Column(
              children: [
                const Icon(Icons.favorite, size: 35, color: Colors.red),
                const Text("2.4k"),
                const SizedBox(height: 25),
                const Icon(Icons.share, size: 35),
                const Text("Share"),
              ],
            ),
          )
        ],
      ),
    );
  }
}
