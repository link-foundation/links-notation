// Diagnose formatter integration errors without suppressing reflection causes.
class FormatterProbe {
  public static void main(String[] args) throws Exception {
    try {
      Class<?> formatter = Class.forName("com.diffplug.spotless.glue.java.GoogleJavaFormatFormatterFunc");
      formatter.getConstructor(String.class, String.class, boolean.class, boolean.class, boolean.class)
          .newInstance("1.37.0", "GOOGLE", false, false, true);
    } catch (java.lang.reflect.InvocationTargetException error) {
      error.getCause().printStackTrace();
      System.exit(1);
    }
  }
}
