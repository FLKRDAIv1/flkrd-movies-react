import SwiftUI

/// A reusable SwiftUI View that implements a premium tap-to-zoom feature.
/// It detects double-taps, converts the tap location into a UnitPoint anchor,
/// and applies a smooth spring scale animation.
public struct SmartZoomView<Content: View>: View {
    private let content: Content
    private let maxScale: CGFloat
    
    @State private var scale: CGFloat = 1.0
    @State private var anchor: UnitPoint = .center
    @State private var isZoomed = false
    
    public init(maxScale: CGFloat = 2.5, @ViewBuilder content: () -> Content) {
        self.maxScale = maxScale
        self.content = content()
    }
    
    public var body: some View {
        GeometryReader { geometry in
            content
                // Apply the scale effect with the tap anchor point
                .scaleEffect(scale, anchor: anchor)
                // Native Apple-style spring animation for fluid transitions
                .animation(.spring(response: 0.45, dampingFraction: 0.75, blendDuration: 0), value: scale)
                .contentShape(Rectangle()) // Make the entire container tap-sensitive
                .onTapGesture(count: 2, coordinateSpace: .local) { location in
                    if isZoomed {
                        // Zoom out to original scale, resetting anchor to center
                        scale = 1.0
                        anchor = .center
                        isZoomed = false
                    } else {
                        // Zoom in: Calculate the relative tap coordinate (0.0 to 1.0)
                        // by dividing the tap point coordinates by the view's dimensions.
                        let xUnit = geometry.size.width > 0 ? location.x / geometry.size.width : 0.5
                        let yUnit = geometry.size.height > 0 ? location.y / geometry.size.height : 0.5
                        
                        // Clamp the unit values to ensure the anchor stays strictly within bounds [0, 1]
                        let clampedX = max(0.0, min(1.0, xUnit))
                        let clampedY = max(0.0, min(1.0, yUnit))
                        
                        anchor = UnitPoint(x: clampedX, y: clampedY)
                        scale = maxScale
                        isZoomed = true
                    }
                }
        }
        .clipped() // Prevent zoomed content from bleeding outside the layout bounds
    }
}

/// A specialized helper View for zooming an Image.
public struct SmartZoomImageView: View {
    private let image: Image
    private let contentMode: ContentMode
    private let maxScale: CGFloat
    
    public init(_ image: Image, contentMode: ContentMode = .fit, maxScale: CGFloat = 2.5) {
        self.image = image
        self.contentMode = contentMode
        self.maxScale = maxScale
    }
    
    public var body: some View {
        SmartZoomView(maxScale: maxScale) {
            image
                .resizable()
                .aspectRatio(contentMode: contentMode)
        }
    }
}

#Preview {
    VStack {
        SmartZoomView {
            Image(systemName: "photo.artframe")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 250, height: 250)
                .foregroundColor(.blue)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)
        }
        .frame(width: 250, height: 250)
        
        Text("Double-tap any point on the image to zoom in/out.")
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.top)
    }
    .padding()
}
